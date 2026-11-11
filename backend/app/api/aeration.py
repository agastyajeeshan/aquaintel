from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Aerator, AerationEvent, Pond, User, AuditLog
from ..schemas import AeratorCommand
from ..core.aeration_engine import aeration_controller
from ..core.iot_simulator import iot_simulator
from ..core.security import get_current_user

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
def control_aerator(
    aerator_id: int,
    cmd: AeratorCommand,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["ADMIN", "FARM_MANAGER", "OPERATOR"]:
        raise HTTPException(status_code=403, detail="Not authorized to operate aerators")

    aerator = db.query(Aerator).filter(Aerator.id == aerator_id).first()
    if not aerator:
        raise HTTPException(status_code=404, detail="Aerator not found")

    sim_data = iot_simulator.generate_current_pond_readings(aerator.pond_id)
    current_do = sim_data["metrics"]["do"]["value"]
    is_stale = sim_data.get("is_stale", False)
    sensor_offline = sim_data.get("sensor_health") == "OFFLINE"

    now = datetime.utcnow()
    action_name = cmd.action.upper()

    # Backend safety supremacy: prohibit stopping aerators during hypoxia or telemetry loss
    if action_name == "STOP":
        if sensor_offline or is_stale:
            db.add(AuditLog(
                user_id=current_user.id,
                username=current_user.username,
                action="AERATOR_COMMAND_REJECTED",
                resource_type="AERATOR",
                resource_id=str(aerator.id),
                details={"action": action_name, "reason": "TELEMETRY_UNAVAILABLE_OR_STALE", "pond_id": aerator.pond_id}
            ))
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Safety lockout: Cannot stop aerator while pond DO probe is offline or stale."
            )
        if current_do < aeration_controller.DO_EMERGENCY_THRESHOLD:
            db.add(AuditLog(
                user_id=current_user.id,
                username=current_user.username,
                action="AERATOR_COMMAND_REJECTED",
                resource_type="AERATOR",
                resource_id=str(aerator.id),
                details={"action": action_name, "reason": "EMERGENCY_HYPOXIA_LOCKOUT", "pond_do": current_do, "pond_id": aerator.pond_id}
            ))
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Safety lockout: Cannot stop aerator while Pond DO ({current_do:.2f} mg/L) is below emergency threshold ({aeration_controller.DO_EMERGENCY_THRESHOLD:.2f} mg/L)."
            )

    new_status = aerator.status

    if action_name == "START":
        new_status = "RUNNING"
        aerator.mode = "MANUAL"
        trigger_msg = f"Manual start override triggered by {current_user.full_name or current_user.username}."
    elif action_name == "STOP":
        new_status = "STANDBY"
        aerator.mode = "MANUAL"
        trigger_msg = f"Manual stop command issued by {current_user.full_name or current_user.username}."
    elif action_name == "EMERGENCY_OVERRIDE":
        new_status = "RUNNING"
        aerator.mode = "EMERGENCY"
        trigger_msg = f"EMERGENCY OVERRIDE: Forced full throttle operation by {current_user.full_name or current_user.username}."
    elif action_name == "AUTO":
        aerator.mode = "SMART_HYSTERESIS"
        trigger_msg = "Switched to automated smart hysteresis algorithm."
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported aerator command action '{cmd.action}'")

    aerator.status = new_status
    aerator.last_state_change = now

    event = AerationEvent(
        pond_id=aerator.pond_id,
        aerator_id=aerator.id,
        action=action_name,
        trigger_reason=trigger_msg,
        trigger_do_level=current_do,
        duration_minutes=0.0,
        timestamp=now
    )
    db.add(event)
    db.add(AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="AERATOR_COMMAND",
        resource_type="AERATOR",
        resource_id=str(aerator.id),
        details={"action": action_name, "pond_id": aerator.pond_id, "mode": aerator.mode, "pond_do": current_do}
    ))
    db.commit()
    db.refresh(aerator)

    return {
        "status": "SUCCESS",
        "command_status": "EXECUTED",
        "verified_state": aerator.status,
        "aerator_id": aerator.id,
        "code": aerator.aerator_code,
        "new_status": aerator.status,
        "mode": aerator.mode,
        "pond_do": current_do,
        "message": trigger_msg
    }
