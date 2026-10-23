from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Sensor, SensorReading, IngestedTelemetry, Pond, Alert
from ..schemas import TelemetryIngestRequest
from ..config import settings

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])

# Biological & physical sensor validity ranges (Litopenaeus vannamei standards)
PHYSICAL_BOUNDS = {
    "do": {"min": 0.0, "max": 25.0, "unit": "mg/L"},
    "ph": {"min": 4.0, "max": 11.0, "unit": "pH"},
    "temperature": {"min": 10.0, "max": 45.0, "unit": "°C"},
    "salinity": {"min": 0.0, "max": 50.0, "unit": "ppt"},
    "ammonia": {"min": 0.0, "max": 5.0, "unit": "mg/L"},
    "turbidity": {"min": 5.0, "max": 100.0, "unit": "cm"},
    "water_level": {"min": 0.2, "max": 3.0, "unit": "m"},
}

@router.post("", status_code=status.HTTP_201_CREATED)
def ingest_telemetry(payload: TelemetryIngestRequest, db: Session = Depends(get_db)):
    """
    Ingest validated JSON sensor telemetry conforming to Section 12 specification.
    Includes deduplication, range validation, sensor state updates, and critical threshold detection.
    """
    # 1. Deduplication check
    existing = db.query(IngestedTelemetry).filter(IngestedTelemetry.message_id == payload.message_id).first()
    if existing:
        return {
            "status": "DUPLICATE_IGNORED",
            "message_id": payload.message_id,
            "message": "Message with this ID was already ingested"
        }

    # 2. Check pond association
    pond_id = payload.pond_id or 1
    pond = db.query(Pond).filter(Pond.id == pond_id).first()
    if not pond:
        raise HTTPException(status_code=404, detail=f"Target pond ID {pond_id} not found")

    reading_timestamp = payload.timestamp or datetime.now(timezone.utc)
    records_created = 0
    anomalies = []
    sensor_map = {
        "do": payload.readings.do_mg_l,
        "ph": payload.readings.ph,
        "temperature": payload.readings.temperature_c,
        "ammonia": payload.readings.ammonia_mg_l,
        "salinity": payload.readings.salinity_ppt,
        "turbidity": payload.readings.turbidity_cm,
        "water_level": payload.readings.water_level_m,
    }

    # 3. Process each sensor reading
    for stype, sval in sensor_map.items():
        if sval is None:
            continue

        bounds = PHYSICAL_BOUNDS.get(stype, {"min": -100, "max": 1000, "unit": ""})
        # Physical boundary validation
        if sval < bounds["min"] or sval > bounds["max"]:
            anomalies.append({
                "sensor_type": stype,
                "value": sval,
                "reason": f"Value out of physical bounds [{bounds['min']}, {bounds['max']}]"
            })
            continue

        # Evaluate status against thresholds
        thresh = settings.THRESHOLDS.get(stype, {})
        reading_status = "NORMAL"
        if thresh:
            if sval < thresh.get("min", -999) or sval > thresh.get("max", 999):
                reading_status = "CRITICAL" if (stype == "do" and sval < 3.0) else "WARNING"
            elif sval < thresh.get("optimal_min", -999) or sval > thresh.get("optimal_max", 999):
                reading_status = "WARNING"

        # Update or create Sensor Reading
        reading = SensorReading(
            sensor_id=1,  # associated base sensor
            pond_id=pond_id,
            sensor_type=stype,
            value=round(sval, 3),
            unit=bounds["unit"],
            status=reading_status,
            is_simulated=(payload.mode == "SIMULATED"),
            timestamp=reading_timestamp
        )
        db.add(reading)
        records_created += 1

        # Update current sensor state in DB
        db_sensor = db.query(Sensor).filter(
            Sensor.pond_id == pond_id,
            Sensor.sensor_type == stype
        ).first()
        if db_sensor:
            db_sensor.current_value = round(sval, 3)
            db_sensor.last_reading_at = reading_timestamp
            db_sensor.status = "ONLINE"

        # Generate alert if critical condition observed
        if stype == "do" and sval < 3.0:
            db.add(Alert(
                pond_id=pond_id,
                alert_type="LOW_DO",
                severity="CRITICAL",
                title=f"Critical Low DO in Pond {pond.pond_number:02d}: {sval} mg/L",
                description=f"Dissolved oxygen dropped below critical threshold (3.0 mg/L) at {reading_timestamp.strftime('%H:%M:%S')}",
                cause="Heavy respiratory biomass demand / poor circulation",
                recommended_action="Emergency aeration boost triggered. Halt automated feeding.",
                status="ACTIVE"
            ))

    # 4. Record ingested telemetry message for provenance
    db.add(IngestedTelemetry(
        message_id=payload.message_id,
        device_id=payload.device_id,
        farm_id=payload.farm_id,
        pond_id=pond_id,
        mode=payload.mode or "SIMULATED",
        payload=payload.model_dump(mode="json")
    ))
    db.commit()

    return {
        "status": "ACCEPTED",
        "message_id": payload.message_id,
        "device_id": payload.device_id,
        "pond_id": pond_id,
        "records_created": records_created,
        "anomalies": anomalies,
        "timestamp": reading_timestamp.isoformat()
    }

@router.get("/latest")
def get_latest_telemetry(db: Session = Depends(get_db)):
    """Returns the latest reading for each sensor type across ponds."""
    sensors = db.query(Sensor).all()
    return [{
        "pond_id": s.pond_id,
        "sensor_type": s.sensor_type,
        "current_value": s.current_value,
        "unit": s.unit,
        "status": s.status,
        "last_reading_at": s.last_reading_at.isoformat() if s.last_reading_at else None
    } for s in sensors]

@router.get("/history")
def get_telemetry_history(
    pond_id: Optional[int] = None,
    sensor_type: Optional[str] = None,
    limit: int = Query(50, le=500),
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
        "is_simulated": r.is_simulated,
        "timestamp": r.timestamp.isoformat() if r.timestamp else None
    } for r in readings]
