from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Sensor, SensorReading, Pond
from ..core.iot_simulator import iot_simulator

router = APIRouter(prefix="/sensors", tags=["Sensors"])

@router.get("/latest")
def get_latest_readings(db: Session = Depends(get_db)):
    snapshot = iot_simulator.generate_all_ponds_snapshot()
    return snapshot

@router.get("/readings")
def get_sensor_readings(
    pond_id: Optional[int] = None,
    sensor_type: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(SensorReading)
    if pond_id:
        query = query.filter(SensorReading.pond_id == pond_id)
    if sensor_type:
        query = query.filter(SensorReading.sensor_type == sensor_type)
        
    readings = query.order_by(SensorReading.timestamp.desc()).limit(limit).all()
    return [{
        "id": r.id,
        "pond_id": r.pond_id,
        "sensor_type": r.sensor_type,
        "value": r.value,
        "unit": r.unit,
        "status": r.status,
        "timestamp": r.timestamp.isoformat()
    } for r in readings]

@router.get("/health")
def get_sensors_health(db: Session = Depends(get_db)):
    sensors = db.query(Sensor).all()
    health_list = []
    for s in sensors:
        # Check if sensor failure event is active in simulator for this pond
        sim_data = iot_simulator.generate_current_pond_readings(s.pond_id)
        effective_status = "OFFLINE" if sim_data.get("active_event") == "SENSOR_FAILURE" else s.status
        health_list.append({
            "id": s.id,
            "pond_id": s.pond_id,
            "device_id": s.device_id,
            "sensor_type": s.sensor_type,
            "model": s.model,
            "unit": s.unit,
            "current_value": sim_data["metrics"].get(s.sensor_type, {}).get("value", s.current_value),
            "status": effective_status,
            "last_calibrated": (datetime.utcnow() - timedelta(days=14)).strftime("%Y-%m-%d"),
            "signal_snr_db": 28.5
        })
    return health_list
