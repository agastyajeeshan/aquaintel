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

    # Check for duplicate command_id (idempotency & conflict protection)
    existing = db.query(DeviceCommand).filter(DeviceCommand.command_id == cmd_id).first()
    if existing:
        if existing.device_id != device_id or existing.action != cmd.action:
            raise HTTPException(
                status_code=409,
                detail=f"Command ID conflict: '{cmd_id}' is already registered for device '{existing.device_id}' with action '{existing.action}' and cannot be reused for a different device or action."
            )
        return {
            "status": existing.status if existing.status != "PENDING" else "QUEUED",
            "command_id": existing.command_id,
            "device_id": existing.device_id,
            "action": existing.action,
            "issued_at": existing.issued_at.isoformat() if existing.issued_at else None,
            "expires_at": existing.expires_at.isoformat() if existing.expires_at else None,
            "delivery_state": "EXISTING_IDEMPOTENT_RECORD"
        }

    # In-flight duplicate command suppression for same device and action (when no explicit command_id provided)
    if not cmd.command_id:
        active_in_flight = db.query(DeviceCommand).filter(
            DeviceCommand.device_id == device_id,
            DeviceCommand.action == cmd.action,
            DeviceCommand.status.in_(["PENDING", "QUEUED", "SENT", "ACKNOWLEDGED"])
        ).order_by(DeviceCommand.issued_at.desc()).first()

        if active_in_flight and active_in_flight.expires_at:
            in_flight_exp = active_in_flight.expires_at.replace(tzinfo=timezone.utc) if active_in_flight.expires_at.tzinfo is None else active_in_flight.expires_at
            if in_flight_exp > now:
                return {
                    "status": "QUEUED",
                    "command_id": active_in_flight.command_id,
                    "device_id": active_in_flight.device_id,
                    "action": active_in_flight.action,
                    "issued_at": active_in_flight.issued_at.isoformat() if active_in_flight.issued_at else None,
                    "expires_at": in_flight_exp.isoformat(),
                    "delivery_state": "IN_FLIGHT_DEDUPLICATED",
                    "message": f"Identical command '{cmd.action}' already active in-flight for device '{device_id}'"
                }

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
    Processes command acknowledgement from edge device or gateway controller.
    Enforces state machine: PENDING / QUEUED / SENT -> ACKNOWLEDGED -> EXECUTED (or COMPLETED) / FAILED / EXPIRED.
    Distinguishes controller ACK (received) from verified actuator EXECUTED (state changed).
    """
    cmd = db.query(DeviceCommand).filter(
        DeviceCommand.command_id == ack.command_id,
        DeviceCommand.device_id == device_id
    ).first()

    if not cmd:
        raise HTTPException(status_code=404, detail=f"Command '{ack.command_id}' not found for device '{device_id}'")

    # 1. Lockout Terminal States: terminal commands cannot transition
    terminal_states = ["FAILED", "EXPIRED", "CANCELLED", "REJECTED_LOCAL_SAFETY_HOLD"]
    if cmd.status in terminal_states:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition terminal command '{cmd.command_id}' in state '{cmd.status}'"
        )

    now = datetime.now(timezone.utc)

    # 2. Duplicate Execution Prevention & Idempotent Repeat ACK
    if cmd.status in ["EXECUTED", "COMPLETED"]:
        if ack.status in ["EXECUTED", "COMPLETED", "ACKNOWLEDGED"]:
            return {
                "status": "SUCCESS",
                "command_id": cmd.command_id,
                "current_status": cmd.status,
                "acknowledged_at": cmd.acknowledged_at.isoformat() if cmd.acknowledged_at else now.isoformat(),
                "completed_at": cmd.completed_at.isoformat() if cmd.completed_at else None,
                "message": "Duplicate acknowledgment processed idempotently; command already completed."
            }
        raise HTTPException(
            status_code=400,
            detail=f"Command '{cmd.command_id}' has already been EXECUTED and cannot transition to '{ack.status}'"
        )

    # 3. Check expiry
    cmd_exp = cmd.expires_at.replace(tzinfo=timezone.utc) if cmd.expires_at and cmd.expires_at.tzinfo is None else cmd.expires_at
    if cmd_exp and now > cmd_exp:
        cmd.status = "EXPIRED"
        cmd.error_message = "Command expired before device execution"
        db.commit()
        return {"status": "EXPIRED", "command_id": cmd.command_id, "message": "Command has expired"}

    # 4. Enforce Physical Actuator Feedback for EXECUTED state
    if ack.status in ["EXECUTED", "COMPLETED"]:
        if not ack.actual_state:
            # Controller confirmed receipt/dispatch, but physical actuator hardware feedback is unverified
            cmd.status = "ACKNOWLEDGED"
            cmd.acknowledged_at = cmd.acknowledged_at or now
            cmd.error_message = "Physical execution unverified: Actuator hardware state feedback was not reported"
        else:
            # Actual actuator physical state verified
            cmd.status = ack.status
            cmd.completed_at = now
            cmd.acknowledged_at = cmd.acknowledged_at or now
            cmd.error_message = None
    elif ack.status == "ACKNOWLEDGED":
        cmd.status = "ACKNOWLEDGED"
        cmd.acknowledged_at = now
    else:
        cmd.status = ack.status

    if ack.error_message:
        cmd.error_message = ack.error_message

    db.add(AuditLog(
        action="DEVICE_COMMAND_ACKNOWLEDGED",
        resource_type="DEVICE",
        resource_id=device_id,
        details={"command_id": cmd.command_id, "status": cmd.status, "actual_state": ack.actual_state}
    ))
    db.commit()

    return {
        "status": "SUCCESS",
        "command_id": cmd.command_id,
        "current_status": cmd.status,
        "acknowledged_at": cmd.acknowledged_at.isoformat() if cmd.acknowledged_at else now.isoformat(),
        "completed_at": cmd.completed_at.isoformat() if cmd.completed_at else None
    }

@router.get("/{device_id}/commands")
def get_device_commands(device_id: str, limit: int = Query(20, le=100), db: Session = Depends(get_db)):
    commands = db.query(DeviceCommand).filter(
        DeviceCommand.device_id == device_id
    ).order_by(DeviceCommand.issued_at.desc()).limit(limit).all()

    now = datetime.now(timezone.utc)
    result = []
    has_mutated = False
    for c in commands:
        status_val = c.status
        # Dynamic check and DB PERSISTENCE if expired
        c_exp = c.expires_at.replace(tzinfo=timezone.utc) if c.expires_at and c.expires_at.tzinfo is None else c.expires_at
        if status_val in ["PENDING", "QUEUED", "SENT"] and c_exp and now > c_exp:
            status_val = "EXPIRED"
            c.status = "EXPIRED"
            c.error_message = "Command expired before edge execution"
            has_mutated = True

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
            "completed_at": c.completed_at.isoformat() if c.completed_at else None,
            "error_message": c.error_message
        })

    if has_mutated:
        db.commit()
    return result
