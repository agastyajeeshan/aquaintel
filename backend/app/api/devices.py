from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import IoTDevice
from ..core.iot_simulator import iot_simulator

router = APIRouter(prefix="/devices", tags=["IoT Devices"])

@router.get("")
def get_devices(db: Session = Depends(get_db)):
    devices = db.query(IoTDevice).order_by(IoTDevice.pond_id).all()
    now = datetime.utcnow()
    
    device_list = []
    online_count = 0

    for d in devices:
        # Check simulator offline status
        status = d.status
        if iot_simulator.is_offline:
            status = "OFFLINE"
        elif d.pond_id and iot_simulator.injected_events.get(d.pond_id, {}).get("type") == "SENSOR_FAILURE":
            status = "OFFLINE"

        if status == "ONLINE":
            online_count += 1

        device_list.append({
            "id": d.id,
            "device_id": d.device_id,
            "pond_id": d.pond_id,
            "device_type": d.device_type,
            "status": status,
            "battery_pct": d.battery_pct,
            "signal_rssi_dbm": d.signal_rssi_dbm,
            "signal_quality": d.signal_quality,
            "firmware_version": d.firmware_version,
            "ip_address": d.ip_address,
            "uptime_hours": d.uptime_hours,
            "last_seen_seconds_ago": int((now - d.last_seen).total_seconds()) if d.last_seen else 4
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
        last_seen=datetime.utcnow()
    )
    db.add(new_device)
    db.commit()
    db.refresh(new_device)
    return new_device
