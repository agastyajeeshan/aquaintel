from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Feeder, FeedingLog, Pond, User, AuditLog
from ..schemas import FeederCommand
from ..core.feeding_engine import feeding_engine
from ..core.iot_simulator import iot_simulator
from ..core.security import get_current_user

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
        current_ammonia = pond_data["metrics"]["ammonia"]["value"]
        is_stale = pond_data.get("is_stale", False)
        sensor_health = pond_data.get("sensor_health", "ONLINE")
        
        # Check if smart recommendation reduces this feeder
        pond_obj = db.query(Pond).filter(Pond.id == f.pond_id).first()
        biomass = pond_obj.estimated_biomass_kg if pond_obj else 1250.0
        doc = pond_obj.current_age_days if pond_obj else 45
        
        rec = feeding_engine.calculate_feeding_recommendation(
            biomass_kg=biomass,
            doc=doc,
            temp_c=current_temp,
            do_mg_l=current_do,
            ammonia_mg_l=current_ammonia
        )

        block_reason = None
        if sensor_health == "OFFLINE" or is_stale:
            block_reason = "Required pond DO/temperature sensor is offline or stale."
        elif current_do < 4.0:
            block_reason = f"Safety lockout: Pond DO ({current_do:.2f} mg/L) is below 4.00 mg/L minimum."
        elif current_ammonia > 0.10:
            block_reason = f"Ammonia lockout: Pond TAN ({current_ammonia:.3f} mg/L) exceeds 0.100 mg/L."
        elif f.daily_quota_kg and (f.dispensed_today_kg or 0.0) >= f.daily_quota_kg:
            block_reason = "Daily feeding quota already reached."

        feeders_list.append({
            "id": f.id,
            "pond_id": f.pond_id,
            "feeder_code": f.feeder_code,
            "name": f.name,
            "status": "STOPPED" if (rec["status"] == "CRITICAL_STOP" or block_reason) else f.status,
            "hopper_capacity_kg": f.hopper_capacity_kg,
            "current_feed_level_kg": f.current_feed_level_kg,
            "feed_type": f.feed_type,
            "feeding_mode": f.feeding_mode,
            "daily_quota_kg": f.daily_quota_kg,
            "dispensed_today_kg": f.dispensed_today_kg,
            "recommended_today_kg": rec["recommended_feed_kg"],
            "reduction_reason": rec["reasons"][0] if rec["reasons"] else None,
            "reduction_percentage": rec["reduction_percentage"],
            "next_feeding_time": f.next_feeding_time,
            "pond_do": current_do,
            "pond_temp": current_temp,
            "pond_ammonia": current_ammonia,
            "is_stale": is_stale,
            "sensor_health": sensor_health,
            "is_blocked": block_reason is not None,
            "block_reason": block_reason
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
def control_feeder(
    feeder_id: int,
    cmd: FeederCommand,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["ADMIN", "FARM_MANAGER", "OPERATOR"]:
        raise HTTPException(status_code=403, detail="Not authorized to operate feeders")

    feeder = db.query(Feeder).filter(Feeder.id == feeder_id).first()
    if not feeder:
        raise HTTPException(status_code=404, detail="Feeder not found")

    action_name = cmd.action.upper()
    pond_data = iot_simulator.generate_current_pond_readings(feeder.pond_id)
    current_do = pond_data["metrics"]["do"]["value"]
    current_temp = pond_data["metrics"]["temperature"]["value"]
    current_ammonia = pond_data["metrics"]["ammonia"]["value"]
    is_stale = pond_data.get("is_stale", False)
    sensor_offline = pond_data.get("sensor_health") == "OFFLINE"

    if action_name in ["START", "DISPENSE"]:
        amount_to_dispense = cmd.amount_kg or 2.5
        if sensor_offline or is_stale:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Feeding blocked: Required pond sensor telemetry is offline or stale."
            )
        if current_do < 4.0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Feeding safety lockout: Pond DO ({current_do:.2f} mg/L) is below minimum safe threshold (4.00 mg/L)."
            )
        if current_ammonia > 0.10:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Feeding safety lockout: Pond TAN ({current_ammonia:.3f} mg/L) exceeds 0.100 mg/L safety threshold."
            )
        if feeder.daily_quota_kg and ((feeder.dispensed_today_kg or 0.0) + amount_to_dispense) > feeder.daily_quota_kg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Feeding blocked: Dispensing {amount_to_dispense:.1f} kg exceeds remaining daily quota ({feeder.daily_quota_kg:.1f} kg)."
            )

        feeder.status = "FEEDING" if action_name == "START" else "STANDBY"
        feeder.dispensed_today_kg = round((feeder.dispensed_today_kg or 0.0) + amount_to_dispense, 1)
        if feeder.current_feed_level_kg is not None:
            feeder.current_feed_level_kg = max(0.0, round(feeder.current_feed_level_kg - amount_to_dispense, 1))
        log = FeedingLog(
            pond_id=feeder.pond_id,
            feeder_id=feeder.id,
            amount_kg=amount_to_dispense,
            planned_amount_kg=amount_to_dispense,
            reduction_reason=f"Manual actuator trigger ({action_name}) initiated by {current_user.full_name or current_user.username}.",
            do_at_feeding=current_do,
            temp_at_feeding=current_temp,
            status="COMPLETED",
            timestamp=datetime.utcnow()
        )
        db.add(log)
    elif action_name == "STOP":
        feeder.status = "STANDBY"
    elif action_name == "SCHEDULE":
        if cmd.schedule_time:
            feeder.next_feeding_time = cmd.schedule_time
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported feeder action '{cmd.action}'")

    db.add(AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="FEEDER_COMMAND",
        resource_type="FEEDER",
        resource_id=str(feeder.id),
        details={"action": action_name, "pond_id": feeder.pond_id, "amount_kg": cmd.amount_kg, "pond_do": current_do}
    ))
    db.commit()
    db.refresh(feeder)
    return {
        "status": "SUCCESS",
        "command_status": "EXECUTED",
        "verified_state": feeder.status,
        "feeder_id": feeder.id,
        "new_status": feeder.status,
        "dispensed_today_kg": feeder.dispensed_today_kg,
        "message": f"Actuator command '{action_name}' executed successfully on {feeder.feeder_code}"
    }
