from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Aerator, AerationEvent, Pond
from ..schemas import AeratorCommand
from ..core.aeration_engine import aeration_controller
from ..core.iot_simulator import iot_simulator

router = APIRouter(prefix="/aeration", tags=["Aeration"])

@router.get("/status")
def get_aeration_status(db: Session = Depends(get_db)):
    aerators = db.query(Aerator).order_by(Aerator.pond_id, Aerator.id).all()
    aerator_list = []
    
    total_active = 0
    total_kwh = 0.0

    for a in aerators:
        pond_data = iot_simulator.generate_current_pond_readings(a.pond_id)
        current_do = pond_data["metrics"]["do"]["value"]
        
        # Evaluate state with smart hysteresis
        eval_result = aeration_controller.evaluate_aerator_state(
            current_do=current_do,
            current_status=a.status,
            last_state_change=a.last_state_change or datetime.utcnow(),
            mode=a.mode
        )
        
        effective_status = eval_result["new_status"]
        if effective_status == "RUNNING":
            total_active += 1
        
        total_kwh += a.total_kwh_today or 0.0

        aerator_list.append({
            "id": a.id,
            "pond_id": a.pond_id,
            "aerator_code": a.aerator_code,
            "name": a.name,
            "aerator_type": a.aerator_type,
            "power_rating_kw": a.power_rating_kw,
            "status": effective_status,
            "mode": a.mode,
            "pond_do": current_do,
            "runtime_hours_today": a.runtime_hours_today,
            "total_kwh_today": a.total_kwh_today,
            "reason": eval_result["reason"],
            "can_switch": eval_result["can_switch"]
        })

    # Recent aeration switch events
    recent_events = db.query(AerationEvent).order_by(AerationEvent.timestamp.desc()).limit(10).all()
    events_list = [{
        "id": e.id,
        "pond_id": e.pond_id,
        "aerator_id": e.aerator_id,
        "action": e.action,
        "trigger_reason": e.trigger_reason,
        "trigger_do_level": e.trigger_do_level,
        "duration_minutes": e.duration_minutes,
        "timestamp": e.timestamp.strftime("%H:%M IST, %d %b")
    } for e in recent_events]

    return {
        "summary": {
            "total_aerators": len(aerators),
            "active_aerators": total_active,
            "standby_aerators": len(aerators) - total_active,
            "total_kwh_today": round(total_kwh, 1),
            "total_cost_inr": round(total_kwh * 7.50, 2),
            "hysteresis_window_minutes": 10
        },
        "aerators": aerator_list,
        "recent_events": events_list
    }

@router.post("/{aerator_id}/control")
def control_aerator(aerator_id: int, cmd: AeratorCommand, db: Session = Depends(get_db)):
    aerator = db.query(Aerator).filter(Aerator.id == aerator_id).first()
    if not aerator:
        raise HTTPException(status_code=404, detail="Aerator not found")

    now = datetime.utcnow()
    new_status = aerator.status
    action_name = cmd.action

    if cmd.action == "START":
        new_status = "RUNNING"
        aerator.mode = "MANUAL"
        trigger_msg = "Manual start override triggered by operator."
    elif cmd.action == "STOP":
        new_status = "STANDBY"
        aerator.mode = "MANUAL"
        trigger_msg = "Manual stop command issued."
    elif cmd.action == "EMERGENCY_OVERRIDE":
        new_status = "RUNNING"
        aerator.mode = "EMERGENCY"
        trigger_msg = "EMERGENCY OVERRIDE: Forced full throttle operation."
    elif cmd.action == "AUTO":
        aerator.mode = "SMART_HYSTERESIS"
        trigger_msg = "Switched to automated smart hysteresis algorithm."

    aerator.status = new_status
    aerator.last_state_change = now

    event = AerationEvent(
        pond_id=aerator.pond_id,
        aerator_id=aerator.id,
        action=action_name,
        trigger_reason=trigger_msg,
        trigger_do_level=6.2,
        duration_minutes=0.0,
        timestamp=now
    )
    db.add(event)
    db.commit()
    db.refresh(aerator)

    return {
        "status": "SUCCESS",
        "aerator_id": aerator.id,
        "code": aerator.aerator_code,
        "new_status": aerator.status,
        "mode": aerator.mode,
        "message": trigger_msg
    }
