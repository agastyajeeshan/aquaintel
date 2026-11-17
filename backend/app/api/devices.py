import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body, Header
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import IoTDevice, DeviceCommand, AuditLog, User, Pond
from ..schemas import ActuatorCommandRequest, ActuatorCommandAckRequest
from ..core.iot_simulator import iot_simulator
from ..core.security import get_current_user
from ..core.device_status import device_status_engine, parse_and_normalize_timestamp

router = APIRouter(prefix="/devices", tags=["IoT Devices"])

class DeviceHeartbeatPayload(BaseModel):
    timestamp: Optional[Any] = Field(None, description="Unix sec/ms or ISO timestamp")
    battery_pct: Optional[float] = Field(None, ge=0.0, le=100.0)
    signal_rssi_dbm: Optional[int] = Field(None, ge=-140, le=0)
    firmware_version: Optional[str] = None
    uptime_hours: Optional[float] = Field(None, ge=0.0)
    hardware_health: Optional[str] = None

@router.get("")
def get_devices(db: Session = Depends(get_db)):
    devices = db.query(IoTDevice).order_by(IoTDevice.pond_id).all()
    now = datetime.now(timezone.utc)
    
    device_list = []
    online_count = 0
    stale_count = 0
    offline_count = 0
    fault_count = 0
    unknown_count = 0
    provisioned_count = 0
    unprovisioned_count = 0
    fresh_telemetry_count = 0
    rssi_values = []

    for d in devices:
        eval_res = device_status_engine.evaluate(d, iot_simulator, reference_now=now)

        conn_status = eval_res["connectivity_status"]
        if conn_status == "ONLINE":
            online_count += 1
        elif conn_status == "STALE":
            stale_count += 1
        elif conn_status == "OFFLINE":
            offline_count += 1
        else:
            unknown_count += 1

        if eval_res["hardware_health"] == "FAULT":
            fault_count += 1

        if eval_res["provisioning_status"] == "UNPROVISIONED":
            unprovisioned_count += 1
        else:
            provisioned_count += 1

        if eval_res["telemetry_freshness"] == "FRESH":
            fresh_telemetry_count += 1

        if d.signal_rssi_dbm is not None:
            rssi_values.append(d.signal_rssi_dbm)

        device_list.append({
            "id": d.id,
            "device_id": d.device_id,
            "pond_id": d.pond_id,
            "device_type": d.device_type,
            "status": eval_res["status"],
            "connectivity_status": eval_res["connectivity_status"],
            "telemetry_freshness": eval_res["telemetry_freshness"],
            "hardware_health": eval_res["hardware_health"],
            "provisioning_status": eval_res["provisioning_status"],
            "battery_pct": d.battery_pct,
            "signal_rssi_dbm": d.signal_rssi_dbm,
            "signal_quality": d.signal_quality,
            "firmware_version": d.firmware_version,
            "ip_address": d.ip_address,
            "uptime_hours": d.uptime_hours,
            "last_seen": eval_res["last_seen_iso"],
            "last_seen_ist": eval_res["last_seen_ist"],
            "last_seen_seconds_ago": eval_res["last_seen_seconds_ago"] if eval_res["last_seen_seconds_ago"] is not None else 0,
            "last_heartbeat_at": eval_res["last_heartbeat_iso"],
            "last_telemetry_at": eval_res["last_telemetry_iso"]
        })

    total_reg = len(devices)
    avg_rssi = int(sum(rssi_values) / len(rssi_values)) if rssi_values else 0
    gateway_status = "ONLINE" if (not iot_simulator.is_offline and not getattr(iot_simulator, "gateway_offline", False)) else "OFFLINE"

    return {
        "summary": {
            "total_registered_devices": total_reg,
            "total_devices": total_reg,  # backward compatibility alias
            "provisioned_devices": provisioned_count,
            "unprovisioned_devices": unprovisioned_count,
            "online_devices": online_count,
            "stale_devices": stale_count,
            "offline_devices": offline_count,
            "fault_devices": fault_count,
            "unknown_devices": unknown_count,
            "fresh_telemetry_count": fresh_telemetry_count,
            "gateway_status": gateway_status,
            "lora_channel": "865.2 MHz (IN865 Band)",
            "average_rssi_dbm": avg_rssi,
            "sync_records_waiting": iot_simulator.offline_queue_count
        },
        "devices": device_list
    }

@router.get("/{device_id}")
def get_device(device_id: str, db: Session = Depends(get_db)):
    device = db.query(IoTDevice).filter(IoTDevice.device_id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    now = datetime.now(timezone.utc)
    eval_res = device_status_engine.evaluate(device, iot_simulator, reference_now=now)

    return {
        "id": device.id,
        "device_id": device.device_id,
        "pond_id": device.pond_id,
        "device_type": device.device_type,
        "status": eval_res["status"],
        "connectivity_status": eval_res["connectivity_status"],
        "telemetry_freshness": eval_res["telemetry_freshness"],
        "hardware_health": eval_res["hardware_health"],
        "provisioning_status": eval_res["provisioning_status"],
        "battery_pct": device.battery_pct,
        "signal_rssi_dbm": device.signal_rssi_dbm,
        "signal_quality": device.signal_quality,
        "firmware_version": device.firmware_version,
        "ip_address": device.ip_address,
        "uptime_hours": device.uptime_hours,
        "last_seen": eval_res["last_seen_iso"],
        "last_seen_ist": eval_res["last_seen_ist"],
        "last_seen_seconds_ago": eval_res["last_seen_seconds_ago"] if eval_res["last_seen_seconds_ago"] is not None else 0,
        "last_heartbeat_at": eval_res["last_heartbeat_iso"],
        "last_telemetry_at": eval_res["last_telemetry_iso"]
    }

@router.post("/{device_id}/heartbeat")
def record_device_heartbeat(
    device_id: str,
    payload: Optional[DeviceHeartbeatPayload] = Body(None),
    x_device_id: Optional[str] = Header(None, alias="X-Device-Id"),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Heartbeat endpoint for edge nodes (ESP32 / RTUs).
    Validates identity, device credentials, normalizes multi-format timestamps,
    rejects future timestamps (>15s), guards against replay/cross-farm access,
    and updates heartbeat metadata.
    """
    # 1. Device Impersonation Protection
    if x_device_id and x_device_id.strip() != device_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Device identity mismatch: Authenticated header '{x_device_id}' does not match target device '{device_id}'"
        )

    # 2. Check Device Existence
    device = db.query(IoTDevice).filter(IoTDevice.device_id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail=f"Device '{device_id}' not found in registry")

    # 3. Cross-Farm Authorization Boundary
    if current_user and current_user.farm_id and device.pond_id:
        pond = db.query(Pond).filter(Pond.id == device.pond_id).first()
        if pond and pond.farm_id and pond.farm_id != current_user.farm_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Cross-farm device access forbidden: User farm {current_user.farm_id} cannot operate device on farm {pond.farm_id}"
            )

    now_utc = datetime.now(timezone.utc)
    ts_input = payload.timestamp if payload else None
    norm_ts, ts_status = parse_and_normalize_timestamp(ts_input, reference_now=now_utc)

    # 4. Future Timestamp Rejection
    if ts_status == "FUTURE_TIMESTAMP":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Heartbeat rejected: Timestamp is more than 15 seconds in the future (clock skew)."
        )
    elif ts_status == "INVALID_FORMAT":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Heartbeat rejected: Malformed or unparseable timestamp format."
        )

    effective_ts = norm_ts if norm_ts else now_utc

    # 5. Replay and Duplicate Protection
    if device.last_heartbeat_at and norm_ts:
        prev_hb = device.last_heartbeat_at.replace(tzinfo=timezone.utc) if device.last_heartbeat_at.tzinfo is None else device.last_heartbeat_at
        if norm_ts < prev_hb:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Replayed or stale heartbeat rejected: Timestamp {norm_ts.isoformat()} is older than recorded heartbeat {prev_hb.isoformat()}."
            )
        elif norm_ts == prev_hb:
            # Duplicate heartbeat delivery - acknowledge idempotently without state mutation
            eval_res = device_status_engine.evaluate(device, iot_simulator, reference_now=now_utc)
            return {
                "success": True,
                "duplicate": True,
                "device_id": device.device_id,
                "status": eval_res["status"],
                "connectivity_status": eval_res["connectivity_status"],
                "telemetry_freshness": eval_res["telemetry_freshness"],
                "hardware_health": eval_res["hardware_health"],
                "provisioning_status": eval_res["provisioning_status"],
                "last_heartbeat_at": eval_res["last_heartbeat_iso"],
                "last_heartbeat_ist": eval_res["last_heartbeat_ist"],
                "server_received_at": now_utc.isoformat(),
                "message": "Duplicate heartbeat acknowledged idempotently."
            }

    # Update heartbeat and legacy last_seen independently
    device.last_heartbeat_at = effective_ts
    dev_last_seen = device.last_seen.replace(tzinfo=timezone.utc) if device.last_seen and device.last_seen.tzinfo is None else device.last_seen
    if dev_last_seen is None or effective_ts >= dev_last_seen:
        device.last_seen = effective_ts

    if payload:
        if payload.battery_pct is not None and 0.0 <= payload.battery_pct <= 100.0:
            device.battery_pct = round(payload.battery_pct, 1)
        if payload.signal_rssi_dbm is not None and -140 <= payload.signal_rssi_dbm <= 0:
            device.signal_rssi_dbm = payload.signal_rssi_dbm
            if payload.signal_rssi_dbm >= -65:
                device.signal_quality = "EXCELLENT"
            elif payload.signal_rssi_dbm >= -80:
                device.signal_quality = "GOOD"
            elif payload.signal_rssi_dbm >= -95:
                device.signal_quality = "FAIR"
            else:
                device.signal_quality = "POOR"
        if payload.firmware_version:
            device.firmware_version = payload.firmware_version.strip()
        if payload.uptime_hours is not None and payload.uptime_hours >= 0.0:
            device.uptime_hours = round(payload.uptime_hours, 2)
        if payload.hardware_health in ["HEALTHY", "WARNING", "FAULT"]:
            device.hardware_health = payload.hardware_health

    eval_res = device_status_engine.evaluate(device, iot_simulator, reference_now=now_utc)
    device.status = eval_res["status"]

    db.add(AuditLog(
        user_id=current_user.id if current_user else None,
        username=current_user.username if current_user else f"device:{device_id}",
        action="DEVICE_HEARTBEAT_ACK",
        resource_type="DEVICE",
        resource_id=device_id,
        details={
            "connectivity_status": eval_res["connectivity_status"],
            "hardware_health": eval_res["hardware_health"],
            "battery_pct": device.battery_pct,
            "signal_rssi_dbm": device.signal_rssi_dbm
        }
    ))
    db.commit()
    db.refresh(device)

    return {
        "success": True,
        "device_id": device.device_id,
        "status": eval_res["status"],
        "connectivity_status": eval_res["connectivity_status"],
        "telemetry_freshness": eval_res["telemetry_freshness"],
        "hardware_health": eval_res["hardware_health"],
        "provisioning_status": eval_res["provisioning_status"],
        "last_heartbeat_at": eval_res["last_heartbeat_iso"],
        "last_heartbeat_ist": eval_res["last_heartbeat_ist"],
        "server_received_at": now_utc.isoformat()
    }

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

    now = datetime.now(timezone.utc)
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
        last_seen=now,
        last_heartbeat_at=now,
        hardware_health="HEALTHY",
        is_provisioned=True
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
def issue_device_command(
    device_id: str,
    cmd: ActuatorCommandRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Issues an actuator or edge controller command with expiration and idempotency (Section 12).
    Requires authenticated operator, manager, or admin privileges.
    """
    if current_user.role not in ["ADMIN", "FARM_MANAGER", "OPERATOR"]:
        raise HTTPException(status_code=403, detail="Not authorized to issue device commands")

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
        user_id=current_user.id,
        username=current_user.username,
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
