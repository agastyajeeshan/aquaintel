from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Feeder, FeedingLog, Pond
from ..schemas import FeederCommand
from ..core.feeding_engine import feeding_engine
from ..core.iot_simulator import iot_simulator

router = APIRouter(prefix="/feeding", tags=["Feeding"])

@router.get("/status")
def get_feeding_status(db: Session = Depends(get_db)):
    feeders = db.query(Feeder).order_by(Feeder.pond_id).all()
    logs = db.query(FeedingLog).order_by(FeedingLog.timestamp.desc()).limit(15).all()
    
    total_quota = sum(f.daily_quota_kg or 0 for f in feeders)
    total_dispensed = sum(f.dispensed_today_kg or 0 for f in feeders)
    total_remaining = max(0.0, total_quota - total_dispensed)
    
    feeders_list = []
    for f in feeders:
        pond_data = iot_simulator.generate_current_pond_readings(f.pond_id)
        current_do = pond_data["metrics"]["do"]["value"]
        current_temp = pond_data["metrics"]["temperature"]["value"]
        
        # Check if smart recommendation reduces this feeder
        pond_obj = db.query(Pond).filter(Pond.id == f.pond_id).first()
        biomass = pond_obj.estimated_biomass_kg if pond_obj else 1250.0
        doc = pond_obj.current_age_days if pond_obj else 45
        
        rec = feeding_engine.calculate_feeding_recommendation(
            biomass_kg=biomass,
            doc=doc,
            temp_c=current_temp,
            do_mg_l=current_do
        )

        feeders_list.append({
            "id": f.id,
            "pond_id": f.pond_id,
            "feeder_code": f.feeder_code,
            "name": f.name,
            "status": "STOPPED" if rec["status"] == "CRITICAL_STOP" else f.status,
            "hopper_capacity_kg": f.hopper_capacity_kg,
            "current_feed_level_kg": f.current_feed_level_kg,
            "feed_type": f.feed_type,
            "feeding_mode": f.feeding_mode,
            "daily_quota_kg": f.daily_quota_kg,
            "dispensed_today_kg": f.dispensed_today_kg,
            "recommended_today_kg": rec["recommended_feed_kg"],
            "reduction_reason": rec["reasons"][0] if rec["reasons"] else None,
            "reduction_percentage": rec["reduction_percentage"],
            "next_feeding_time": f.next_feeding_time
        })

    logs_list = [{
        "id": l.id,
        "pond_id": l.pond_id,
        "feeder_id": l.feeder_id,
        "amount_kg": l.amount_kg,
        "planned_amount_kg": l.planned_amount_kg,
        "reduction_reason": l.reduction_reason,
        "do_at_feeding": l.do_at_feeding,
        "temp_at_feeding": l.temp_at_feeding,
        "feeding_response_score": l.feeding_response_score,
        "status": l.status,
        "timestamp": l.timestamp.strftime("%H:%M IST, %d %b")
    } for l in logs]

    return {
        "summary": {
            "today_feed_kg": round(total_dispensed, 1),
            "recommended_feed_kg": round(total_quota * 0.94, 1),
            "feed_consumed_kg": round(total_dispensed * 0.96, 1),
            "feed_remaining_kg": round(total_remaining, 1),
            "fcr": 1.24,
            "feeding_efficiency_pct": 94.2
        },
        "feeders": feeders_list,
        "recent_logs": logs_list
    }

@router.post("/calculate")
def calculate_recommendation(
    biomass_kg: float,
    doc: int,
    temp_c: float,
    do_mg_l: float,
    ammonia_mg_l: float = 0.02,
    uneaten_feed: bool = False
):
    result = feeding_engine.calculate_feeding_recommendation(
        biomass_kg=biomass_kg,
        doc=doc,
        temp_c=temp_c,
        do_mg_l=do_mg_l,
        ammonia_mg_l=ammonia_mg_l,
        uneaten_feed_detected=uneaten_feed
    )
    return result

@router.post("/{feeder_id}/control")
def control_feeder(feeder_id: int, cmd: FeederCommand, db: Session = Depends(get_db)):
    feeder = db.query(Feeder).filter(Feeder.id == feeder_id).first()
    if not feeder:
        raise HTTPException(status_code=404, detail="Feeder not found")

    if cmd.action == "START":
        feeder.status = "FEEDING"
        feeder.dispensed_today_kg = round((feeder.dispensed_today_kg or 0.0) + (cmd.amount_kg or 2.5), 1)
        # Log event
        log = FeedingLog(
            pond_id=feeder.pond_id,
            feeder_id=feeder.id,
            amount_kg=cmd.amount_kg or 2.5,
            planned_amount_kg=cmd.amount_kg or 2.5,
            reduction_reason="Manual actuator trigger initiated by operator.",
            do_at_feeding=6.2,
            temp_at_feeding=29.0,
            status="COMPLETED",
            timestamp=datetime.utcnow()
        )
        db.add(log)
    elif cmd.action == "STOP":
        feeder.status = "STANDBY"
    elif cmd.action == "SCHEDULE":
        if cmd.schedule_time:
            feeder.next_feeding_time = cmd.schedule_time

    db.commit()
    db.refresh(feeder)
    return {
        "status": "SUCCESS",
        "feeder_id": feeder.id,
        "new_status": feeder.status,
        "dispensed_today_kg": feeder.dispensed_today_kg,
        "message": f"Actuator command '{cmd.action}' executed successfully on {feeder.feeder_code}"
    }
