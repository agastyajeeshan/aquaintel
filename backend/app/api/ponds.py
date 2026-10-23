from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Pond, Sensor, SensorReading, Feeder, Aerator, Alert, DiseasePrediction, AuditLog, Farm
from ..schemas import PondCreateRequest, PondUpdateRequest
from ..core.iot_simulator import iot_simulator
from ..core.security import get_current_user, require_roles

router = APIRouter(prefix="/ponds", tags=["Ponds"])

@router.get("")
def get_all_ponds(include_archived: bool = Query(False), db: Session = Depends(get_db)):
    query = db.query(Pond)
    if not include_archived:
        query = query.filter((Pond.is_archived == False) | (Pond.is_archived == None))
    ponds = query.order_by(Pond.pond_number).all()
    result = []
    
    for p in ponds:
        sim_data = iot_simulator.generate_current_pond_readings(p.id)
        
        # Check active aerators
        active_aerators = db.query(Aerator).filter(
            Aerator.pond_id == p.id,
            Aerator.status == "RUNNING"
        ).count()
        total_aerators = db.query(Aerator).filter(Aerator.pond_id == p.id).count() or 4
        
        # Feeder
        feeder = db.query(Feeder).filter(Feeder.pond_id == p.id).first()
        feeder_status = feeder.status if feeder else "STANDBY"
        
        # Max disease risk
        predictions = db.query(DiseasePrediction).filter(DiseasePrediction.pond_id == p.id).all()
        max_disease_risk = "LOW"
        max_score = 0
        for pred in predictions:
            if pred.risk_score > max_score:
                max_score = pred.risk_score
                max_disease_risk = pred.risk_level

        # If simulated event is active, update status
        effective_status = sim_data["status"]

        result.append({
            "id": p.id,
            "pond_number": p.pond_number,
            "name": p.name,
            "area_ha": p.area_ha,
            "water_volume_m3": p.water_volume_m3,
            "shrimp_species": p.shrimp_species,
            "current_age_days": p.current_age_days,
            "stocking_date": p.stocking_date.isoformat() if p.stocking_date else None,
            "estimated_biomass_kg": p.estimated_biomass_kg,
            "survival_rate_pct": p.survival_rate_pct,
            "target_fcr": p.target_fcr,
            "status": effective_status,
            "active_event": sim_data.get("active_event"),
            "water_quality": {
                "do": sim_data["metrics"]["do"]["value"],
                "ph": sim_data["metrics"]["ph"]["value"],
                "temperature": sim_data["metrics"]["temperature"]["value"],
                "ammonia": sim_data["metrics"]["ammonia"]["value"],
                "salinity": sim_data["metrics"]["salinity"]["value"],
                "turbidity": sim_data["metrics"]["turbidity"]["value"],
            },
            "aerator_summary": {
                "active_count": active_aerators,
                "total_count": total_aerators,
                "status": "RUNNING" if active_aerators > 0 else "STANDBY"
            },
            "feeding_summary": {
                "status": feeder_status,
                "dispensed_today_kg": feeder.dispensed_today_kg if feeder else 30.0,
                "daily_quota_kg": feeder.daily_quota_kg if feeder else 45.0,
                "next_feeding_time": feeder.next_feeding_time if feeder else "17:00 IST"
            },
            "disease_risk": max_disease_risk,
            "disease_risk_score": max_score
        })
        
    return result

@router.get("/{pond_id}")
def get_pond_detail(
    pond_id: int,
    time_range: str = Query("24h", pattern="^(24h|7d|30d)$"),
    db: Session = Depends(get_db)
):
    pond = db.query(Pond).filter(Pond.id == pond_id).first()
    if not pond:
        raise HTTPException(status_code=404, detail="Pond not found")

    sim_data = iot_simulator.generate_current_pond_readings(pond.id)

    # Calculate date range
    now = datetime.utcnow()
    hours_map = {"24h": 24, "7d": 168, "30d": 720}
    hours_back = hours_map.get(time_range, 24)
    start_time = now - timedelta(hours=hours_back)

    # Fetch readings
    readings = db.query(SensorReading).filter(
        SensorReading.pond_id == pond_id,
        SensorReading.timestamp >= start_time
    ).order_by(SensorReading.timestamp.asc()).all()

    # Organize chart data grouped by timestamp or interval
    # Create unified timeseries records for Recharts
    # Group readings by timestamp (hour string)
    timeline_dict = {}
    for r in readings:
        t_key = r.timestamp.strftime("%Y-%m-%d %H:%M")
        if t_key not in timeline_dict:
            timeline_dict[t_key] = {"timestamp": t_key}
        timeline_dict[t_key][r.sensor_type] = r.value

    chart_series = list(timeline_dict.values())
    # If 7d or 30d has sparse data, add synthetic trend points
    if len(chart_series) < 10:
        step_hours = 6 if time_range == "7d" else 24
        steps = hours_back // step_hours
        synth_series = []
        for s in range(steps, 0, -1):
            t_synth = now - timedelta(hours=s * step_hours)
            synth_series.append({
                "timestamp": t_synth.strftime("%b %d %H:%M"),
                "do": round(6.0 + 0.8 * (s % 3 - 1), 2),
                "ph": round(8.0 + 0.15 * (s % 2 - 0.5), 2),
                "temperature": round(29.0 + 1.2 * (s % 4 - 1.5), 1),
                "salinity": round(21.0 + 0.3 * (s % 2), 1),
                "ammonia": round(0.02 + 0.01 * (s % 3), 3),
                "turbidity": round(33.0 + 1.5 * (s % 3), 1),
            })
        chart_series = synth_series

    # Aerators for this pond
    aerators = db.query(Aerator).filter(Aerator.pond_id == pond_id).all()
    aerators_data = [{
        "id": a.id,
        "code": a.aerator_code,
        "name": a.name,
        "type": a.aerator_type,
        "power_rating_kw": a.power_rating_kw,
        "status": a.status,
        "mode": a.mode,
        "runtime_hours_today": a.runtime_hours_today,
        "total_kwh_today": a.total_kwh_today
    } for a in aerators]

    # Feeder for this pond
    feeder = db.query(Feeder).filter(Feeder.pond_id == pond_id).first()
    feeder_data = {
        "id": feeder.id if feeder else 1,
        "code": feeder.feeder_code if feeder else f"FEEDER-P{pond.pond_number:02d}",
        "name": feeder.name if feeder else "Smart Feeder",
        "status": feeder.status if feeder else "STANDBY",
        "hopper_capacity_kg": feeder.hopper_capacity_kg if feeder else 120.0,
        "current_feed_level_kg": feeder.current_feed_level_kg if feeder else 75.0,
        "feed_type": feeder.feed_type if feeder else "Grower Pellet",
        "daily_quota_kg": feeder.daily_quota_kg if feeder else 45.0,
        "dispensed_today_kg": feeder.dispensed_today_kg if feeder else 28.5,
        "next_feeding_time": feeder.next_feeding_time if feeder else "17:00 IST"
    } if feeder else None

    # Disease predictions for this pond
    predictions = db.query(DiseasePrediction).filter(DiseasePrediction.pond_id == pond_id).all()
    disease_data = [{
        "disease_name": p.disease_name,
        "risk_score": p.risk_score,
        "risk_level": p.risk_level,
        "contributors": p.contributors,
        "explanation": p.explanation,
        "recommendations": p.recommendations
    } for p in predictions]

    # Alerts for this pond
    alerts = db.query(Alert).filter(Alert.pond_id == pond_id).order_by(Alert.created_at.desc()).limit(5).all()
    alerts_data = [{
        "id": al.id,
        "severity": al.severity,
        "title": al.title,
        "description": al.description,
        "cause": al.cause,
        "recommended_action": al.recommended_action,
        "status": al.status,
        "created_at": al.created_at.isoformat()
    } for al in alerts]

    return {
        "overview": {
            "id": pond.id,
            "pond_number": pond.pond_number,
            "name": pond.name,
            "area_ha": pond.area_ha,
            "water_volume_m3": pond.water_volume_m3,
            "shrimp_species": pond.shrimp_species,
            "stocking_date": pond.stocking_date.isoformat(),
            "current_age_days": pond.current_age_days,
            "estimated_biomass_kg": pond.estimated_biomass_kg,
            "survival_rate_pct": pond.survival_rate_pct,
            "target_fcr": pond.target_fcr,
            "status": sim_data["status"],
            "active_event": sim_data.get("active_event")
        },
        "live_metrics": sim_data["metrics"],
        "chart_series": chart_series,
        "time_range": time_range,
        "aerators": aerators_data,
        "feeder": feeder_data,
        "disease_predictions": disease_data,
        "alerts": alerts_data
    }

@router.post("", status_code=201)
def create_pond(req: PondCreateRequest, db: Session = Depends(get_db)):
    existing = db.query(Pond).filter(Pond.pond_number == req.pond_number).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Pond with number {req.pond_number} already exists")

    farm = db.query(Farm).first()
    farm_id = farm.id if farm else 1

    new_pond = Pond(
        farm_id=farm_id,
        pond_number=req.pond_number,
        name=req.name,
        area_ha=req.area_ha or 1.0,
        water_volume_m3=req.water_volume_m3 or 12000.0,
        shrimp_species=req.shrimp_species or "Litopenaeus vannamei",
        current_age_days=req.current_age_days or 1,
        post_larvae_count=req.post_larvae_count or 450000,
        estimated_biomass_kg=req.estimated_biomass_kg or 100.0,
        target_fcr=req.target_fcr or 1.25,
        status="GREEN",
        notes=req.notes,
        is_archived=False
    )
    db.add(new_pond)
    db.commit()
    db.refresh(new_pond)

    # Automatically provision standard sensor package
    sensor_types = [
        ("do", "Optical DO Probe", "mg/L", 4.0, 8.5, 5.0, 7.5, 6.5),
        ("ph", "Industrial Glass pH Sensor", "pH", 7.5, 8.5, 7.8, 8.3, 8.0),
        ("temperature", "PT100 RTD Submersible", "°C", 26.0, 33.0, 28.0, 31.0, 29.0),
        ("salinity", "Toroidal Inductive Conductivity", "ppt", 10.0, 30.0, 16.0, 24.0, 20.0),
        ("ammonia", "Ion Selective Electrode", "mg/L", 0.0, 0.1, 0.0, 0.05, 0.02),
        ("turbidity", "Infrared Scatter Turbidity", "cm", 25.0, 45.0, 30.0, 40.0, 35.0),
        ("water_level", "Ultrasonic Distance Sensor", "m", 1.0, 1.6, 1.2, 1.4, 1.3),
    ]
    for stype, model, unit, smin, smax, omin, omax, init_val in sensor_types:
        db.add(Sensor(
            pond_id=new_pond.id,
            sensor_type=stype,
            device_id=f"SENS-P{new_pond.pond_number:02d}-{stype.upper()}",
            model=model,
            unit=unit,
            min_safe=smin,
            max_safe=smax,
            optimal_min=omin,
            optimal_max=omax,
            current_value=init_val,
            status="ONLINE"
        ))

    # Add default aerator and feeder
    db.add(Feeder(
        pond_id=new_pond.id,
        feeder_code=f"FEEDER-P{new_pond.pond_number:02d}",
        name=f"Smart Solar Feeder {new_pond.pond_number:02d}",
        hopper_capacity_kg=120.0,
        current_feed_level_kg=90.0
    ))
    db.add(Aerator(
        pond_id=new_pond.id,
        aerator_code=f"AER-P{new_pond.pond_number:02d}-A",
        name=f"Paddlewheel Aerator P{new_pond.pond_number:02d}",
        power_rating_kw=1.5
    ))

    # Record Audit Log
    db.add(AuditLog(
        action="POND_CREATED",
        resource_type="POND",
        resource_id=str(new_pond.id),
        details={"pond_number": new_pond.pond_number, "name": new_pond.name}
    ))
    db.commit()

    return {
        "status": "SUCCESS",
        "message": f"Pond '{new_pond.name}' created with standard sensors and actuators",
        "pond_id": new_pond.id
    }

@router.patch("/{pond_id}")
def update_pond(pond_id: int, req: PondUpdateRequest, db: Session = Depends(get_db)):
    pond = db.query(Pond).filter(Pond.id == pond_id).first()
    if not pond:
        raise HTTPException(status_code=404, detail="Pond not found")

    updated_fields = {}
    for field, val in req.model_dump(exclude_unset=True).items():
        setattr(pond, field, val)
        updated_fields[field] = val

    db.add(AuditLog(
        action="POND_UPDATED",
        resource_type="POND",
        resource_id=str(pond.id),
        details=updated_fields
    ))
    db.commit()

    return {
        "status": "SUCCESS",
        "message": f"Pond {pond_id} updated",
        "updated_fields": updated_fields
    }

@router.delete("/{pond_id}")
def archive_pond(pond_id: int, db: Session = Depends(get_db)):
    pond = db.query(Pond).filter(Pond.id == pond_id).first()
    if not pond:
        raise HTTPException(status_code=404, detail="Pond not found")

    pond.is_archived = True
    db.add(AuditLog(
        action="POND_ARCHIVED",
        resource_type="POND",
        resource_id=str(pond.id),
        details={"pond_number": pond.pond_number, "name": pond.name}
    ))
    db.commit()

    return {
        "status": "SUCCESS",
        "message": f"Pond {pond_id} archived successfully"
    }

