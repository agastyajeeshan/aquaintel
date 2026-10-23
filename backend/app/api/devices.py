import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import IoTDevice, DeviceCommand, AuditLog
from ..schemas import ActuatorCommandRequest, ActuatorCommandAckRequest
from ..core.iot_simulator import iot_simulator

router = APIRouter(prefix="/devices", tags=["IoT Devices"])

@router.get("")
def get_devices(db: Session = Depends(get_db)):
    devices = db.query(IoTDevice).order_by(IoTDevice.pond_id).all()
    now = datetime.now(timezone.utc)
    
    device_list = []
    online_count = 0

    for d in devices:
        status_val = d.status
        if iot_simulator.is_offline:
            status_val = "OFFLINE"
        elif d.pond_id and iot_simulator.injected_events.get(d.pond_id, {}).get("type") == "SENSOR_FAILURE":
            status_val = "OFFLINE"

        if status_val == "ONLINE":
            online_count += 1

        last_seen_dt = d.last_seen.replace(tzinfo=timezone.utc) if d.last_seen and d.last_seen.tzinfo is None else d.last_seen
        diff_sec = int((now - last_seen_dt).total_seconds()) if last_seen_dt else 4

        device_list.append({
            "id": d.id,
            "device_id": d.device_id,
            "pond_id": d.pond_id,
            "device_type": d.device_type,
            "status": status_val,
            "battery_pct": d.battery_pct,
            "signal_rssi_dbm": d.signal_rssi_dbm,
            "signal_quality": d.signal_quality,
            "firmware_version": d.firmware_version,
            "ip_address": d.ip_address,
            "uptime_hours": d.uptime_hours,
            "last_seen_seconds_ago": max(0, diff_sec)
        })

    return {
        "summary": {
            "total_devices": len(devices),
            "online_devices": online_count,
            "offline_devices": len(devices) - online_count,
            "gateway_status": "ONLINE" if not iot_simulator.is_offline else "STANDBY_OFFLINE",
            "lora_channel": "865.2 MHz (IN865 Band)",
            "average_rssi_dbm": -64,
            "sync_records_waiting": iot_simulator.offline_queue_count
        },
        "devices": device_list
    }

@router.get("/{device_id}")
def get_device(device_id: str, db: Session = Depends(get_db)):
    device = db.query(IoTDevice).filter(IoTDevice.device_id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device

@router.post("")
def add_device(
    device_id: str,
    device_type: str,
    pond_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    existing = db.query(IoTDevice).filter(IoTDevice.device_id == device_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Device ID already exists")

    new_device = IoTDevice(
        device_id=device_id,
        pond_id=pond_id,
        device_type=device_type,
        status="ONLINE",
        battery_pct=100.0,
        signal_rssi_dbm=-62,
        signal_quality="EXCELLENT",
        firmware_version="v2.4.1",
        uptime_hours=1.0,
        last_seen=datetime.now(timezone.utc)
    )
    db.add(new_device)
    db.add(AuditLog(
        action="DEVICE_REGISTERED",
        resource_type="DEVICE",
        resource_id=device_id,
        details={"device_type": device_type, "pond_id": pond_id}
    ))
    db.commit()
    db.refresh(new_device)
    return new_device

@router.post("/{device_id}/commands", status_code=status.HTTP_201_CREATED)
def issue_device_command(device_id: str, cmd: ActuatorCommandRequest, db: Session = Depends(get_db)):
    """
    Issues an actuator or edge controller command with expiration and idempotency (Section 12).
    """
    device = db.query(IoTDevice).filter(IoTDevice.device_id == device_id).first()
    if not device:
        # Check if device is aerator/feeder code as fallback
        pass

    cmd_id = cmd.command_id or f"CMD-{uuid.uuid4().hex[:12].upper()}"
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=cmd.expires_in_seconds or 300)

    # Check for duplicate command_id
    existing = db.query(DeviceCommand).filter(DeviceCommand.command_id == cmd_id).first()
    if existing:
        return existing

    record = DeviceCommand(
        command_id=cmd_id,
        device_id=device_id,
        pond_id=device.pond_id if device else None,
        action=cmd.action,
        payload=cmd.model_dump(mode="json"),
        status="PENDING",
        reason=cmd.reason,
        mode=cmd.mode or "MANUAL",
        issued_at=now,
        expires_at=expires_at
    )
    db.add(record)
    db.add(AuditLog(
        action="DEVICE_COMMAND_ISSUED",
        resource_type="DEVICE",
        resource_id=device_id,
        details={"command_id": cmd_id, "action": cmd.action, "reason": cmd.reason}
    ))
    db.commit()
    db.refresh(record)

    return {
        "status": "QUEUED",
        "command_id": cmd_id,
        "device_id": device_id,
        "action": cmd.action,
        "issued_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
        "delivery_state": "PENDING_GATEWAY_DISPATCH"
    }

@router.post("/{device_id}/ack")
def acknowledge_device_command(device_id: str, ack: ActuatorCommandAckRequest, db: Session = Depends(get_db)):
    """
    Processes command acknowledgement from edge device or gateway simulator.
    Transitions state machine: PENDING -> ACKNOWLEDGED / COMPLETED / FAILED.
    """
    cmd = db.query(DeviceCommand).filter(
        DeviceCommand.command_id == ack.command_id,
        DeviceCommand.device_id == device_id
    ).first()

    if not cmd:
        raise HTTPException(status_code=404, detail=f"Command '{ack.command_id}' not found for device '{device_id}'")

    now = datetime.now(timezone.utc)
    # Check expiry
    if cmd.expires_at and now > cmd.expires_at.replace(tzinfo=timezone.utc):
        cmd.status = "EXPIRED"
        cmd.error_message = "Command expired before device execution"
        db.commit()
        return {"status": "EXPIRED", "command_id": cmd.command_id, "message": "Command has expired"}

    cmd.status = ack.status
    cmd.acknowledged_at = now
    if ack.status == "COMPLETED":
        cmd.completed_at = now
    if ack.error_message:
        cmd.error_message = ack.error_message

    db.add(AuditLog(
        action="DEVICE_COMMAND_ACKNOWLEDGED",
        resource_type="DEVICE",
        resource_id=device_id,
        details={"command_id": cmd.command_id, "status": ack.status, "actual_state": ack.actual_state}
    ))
    db.commit()

    return {
        "status": "SUCCESS",
        "command_id": cmd.command_id,
        "current_status": cmd.status,
        "acknowledged_at": now.isoformat()
    }

@router.get("/{device_id}/commands")
def get_device_commands(device_id: str, limit: int = Query(20, le=100), db: Session = Depends(get_db)):
    commands = db.query(DeviceCommand).filter(
        DeviceCommand.device_id == device_id
    ).order_by(DeviceCommand.issued_at.desc()).limit(limit).all()

    now = datetime.now(timezone.utc)
    result = []
    for c in commands:
        status_val = c.status
        # Dynamic check if expired
        if status_val == "PENDING" and c.expires_at and now > c.expires_at.replace(tzinfo=timezone.utc):
            status_val = "EXPIRED"

        result.append({
            "command_id": c.command_id,
            "device_id": c.device_id,
            "action": c.action,
            "status": status_val,
            "reason": c.reason,
            "mode": c.mode,
            "issued_at": c.issued_at.isoformat() if c.issued_at else None,
            "expires_at": c.expires_at.isoformat() if c.expires_at else None,
            "acknowledged_at": c.acknowledged_at.isoformat() if c.acknowledged_at else None,
            "error_message": c.error_message
        })
    return result
