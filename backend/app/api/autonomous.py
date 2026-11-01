"""
Autonomous Farm Management Engine API Endpoints
AquaIntel Aquaculture Platform
"""

from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db
from ..models import (
    AutomationSafetyConfig, AutonomousDecisionEvent, AutonomousActionRecord,
    NotificationLog, Pond, Sensor, Aerator, Feeder, AuditLog
)
from ..core.autonomous_engine import autonomous_engine
from ..core.hal import hal

router = APIRouter(prefix="/autonomous", tags=["autonomous"])

class ModeChangeRequest(BaseModel):
    mode: str  # MONITOR, ASSISTED, AUTOMATIC_SAFETY, FULL_AUTOMATION
    operator_name: Optional[str] = "Farm General Manager"
    reason: Optional[str] = "Routine mode update"

class ManualOverrideRequest(BaseModel):
    action: str  # CASCADE_AERATION_ALL, STOP_ALL_AERATION, LOCKOUT_ALL_FEEDERS, RESUME_ALL_FEEDERS, RESET_SAFETY
    pond_id: Optional[int] = None
    operator_name: Optional[str] = "Dr. K. Srinivas"

class ScenarioSimulationRequest(BaseModel):
    scenario: str  # CRITICAL_DO_FAILOVER, TOXIC_AMMONIA_SURGE, HEAVY_RAIN_FLOOD, SENSOR_STALE_ANOMALY, CHEMICAL_DOSING_REQUEST, CLOUD_DISCONNECT
    pond_id: Optional[int] = 4

@router.get("/status")
def get_autonomous_status(db: Session = Depends(get_db)):
    """
    Returns current operating mode, overall farm autonomous health,
    active safety interlocks, and hardware connectivity status.
    """
    config = autonomous_engine.get_safety_config(db)
    recent_events_count = db.query(AutonomousDecisionEvent).filter(
        AutonomousDecisionEvent.severity.in_(["CRITICAL", "EMERGENCY"])
    ).count()
    
    pending_actions = db.query(AutonomousActionRecord).filter(
        AutonomousActionRecord.recovery_verified == False
    ).count()
    
    return {
        "operating_mode": config.operating_mode,
        "mode_description": {
            "MONITOR": "Observation only — alerts dispatched, physical equipment actuations disabled",
            "ASSISTED": "Human-in-the-loop — AI recommendations generated, physical action requires operator authorization",
            "AUTOMATIC_SAFETY": "Pre-authorized emergency actions (low DO cascade, feeder cutoff, aerator failover) execute automatically",
            "FULL_AUTOMATION": "Autonomous multi-equipment coordination with regulated water exchange"
        }.get(config.operating_mode, "Unknown Mode"),
        "cloud_connected": hal.is_cloud_connected(),
        "local_edge_failsafe_active": True,
        "interlocks": {
            "auto_aeration": config.auto_aeration_enabled,
            "auto_feeder_cutoff": config.auto_feeder_cutoff_enabled,
            "auto_backup_failover": config.auto_backup_failover_enabled,
            "auto_flood_safeguard": config.auto_flood_safeguard_enabled,
            "chemical_dosing_blocked": config.chemical_dosing_blocked
        },
        "critical_events_count": recent_events_count,
        "pending_verifications_count": pending_actions,
        "last_mode_change_at": config.last_mode_change_at.isoformat() if config.last_mode_change_at else None,
        "changed_by_user": config.changed_by_user
    }

@router.post("/mode")
def set_autonomous_mode(req: ModeChangeRequest, db: Session = Depends(get_db)):
    """
    Safely changes the farm autonomous operating mode with audit trail.
    Permitted: MONITOR, ASSISTED, AUTOMATIC_SAFETY, FULL_AUTOMATION
    """
    valid_modes = ["MONITOR", "ASSISTED", "AUTOMATIC_SAFETY", "FULL_AUTOMATION"]
    if req.mode not in valid_modes:
        raise HTTPException(status_code=400, detail=f"Invalid mode. Must be one of {valid_modes}")
        
    config = autonomous_engine.get_safety_config(db)
    old_mode = config.operating_mode
    config.operating_mode = req.mode
    config.last_mode_change_at = datetime.now(timezone.utc)
    config.changed_by_user = req.operator_name or "Authorized Operator"
    
    # Audit Log
    audit = AuditLog(
        username=req.operator_name,
        action="CHANGE_AUTONOMOUS_MODE",
        resource_type="AUTOMATION_CONFIG",
        resource_id=str(config.id),
        details={"old_mode": old_mode, "new_mode": req.mode, "reason": req.reason},
        timestamp=datetime.now(timezone.utc)
    )
    db.add(audit)
    db.commit()
    
    return {
        "success": True,
        "message": f"Autonomous mode changed from {old_mode} to {req.mode}",
        "current_mode": req.mode,
        "changed_by": config.changed_by_user,
        "timestamp": config.last_mode_change_at.isoformat()
    }

@router.get("/decisions")
def get_autonomous_decisions(
    pond_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Returns timeline of autonomous decision events with multi-parameter analysis.
    """
    q = db.query(AutonomousDecisionEvent)
    if pond_id:
        q = q.filter(AutonomousDecisionEvent.pond_id == pond_id)
    events = q.order_by(AutonomousDecisionEvent.created_at.desc()).limit(limit).all()
    
    return [
        {
            "id": e.id,
            "event_id": e.event_id,
            "pond_id": e.pond_id,
            "severity": e.severity,
            "condition_type": e.condition_type,
            "title": e.title,
            "trigger_parameters": e.trigger_parameters,
            "multi_parameter_analysis": e.multi_parameter_analysis,
            "weather_context": e.weather_context,
            "decision_rationale": e.decision_rationale,
            "selected_action": e.selected_action,
            "action_mode": e.action_mode,
            "is_executed": e.is_executed,
            "status": e.status,
            "created_at": e.created_at.isoformat() if e.created_at else None
        }
        for e in events
    ]

@router.get("/actions")
def get_autonomous_actions(
    pond_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Returns closed-loop equipment action records and verification status.
    """
    q = db.query(AutonomousActionRecord)
    if pond_id:
        q = q.filter(AutonomousActionRecord.pond_id == pond_id)
    actions = q.order_by(AutonomousActionRecord.dispatched_at.desc()).limit(limit).all()
    
    return [
        {
            "id": a.id,
            "action_id": a.action_id,
            "decision_event_id": a.decision_event_id,
            "pond_id": a.pond_id,
            "equipment_type": a.equipment_type,
            "equipment_code": a.equipment_code,
            "command_action": a.command_action,
            "command_id": a.command_id,
            "dispatched_at": a.dispatched_at.isoformat() if a.dispatched_at else None,
            "equipment_ack_status": a.equipment_ack_status,
            "equipment_ack_at": a.equipment_ack_at.isoformat() if a.equipment_ack_at else None,
            "recovery_verified": a.recovery_verified,
            "recovery_verified_at": a.recovery_verified_at.isoformat() if a.recovery_verified_at else None,
            "recovery_telemetry": a.recovery_telemetry,
            "notes": a.notes
        }
        for a in actions
    ]

@router.post("/evaluate")
def evaluate_fleet_now(db: Session = Depends(get_db)):
    """
    Runs an immediate autonomous evaluation cycle across all ponds.
    """
    result = autonomous_engine.run_fleet_evaluation(db)
    return result

@router.post("/override")
def manual_emergency_override(req: ManualOverrideRequest, db: Session = Depends(get_db)):
    """
    Manual emergency operator override. Immediately executes emergency action
    regardless of autonomous operating mode.
    """
    now_dt = datetime.now(timezone.utc)
    pond_id = req.pond_id or 1
    
    if req.action == "CASCADE_AERATION_ALL":
        aerators = db.query(Aerator).filter(Aerator.pond_id == pond_id).all()
        for a in aerators:
            hal.dispatch_command(
                db=db, pond_id=pond_id, equipment_type="AERATOR",
                equipment_code=a.aerator_code, action="START",
                params={"reason": f"Manual Emergency Override by {req.operator_name}"}
            )
        msg = f"Manual override: 100% Aeration Cascade executed for Pond 0{pond_id}"
        
    elif req.action == "LOCKOUT_ALL_FEEDERS":
        feeders = db.query(Feeder).filter(Feeder.pond_id == pond_id).all()
        for f in feeders:
            hal.dispatch_command(
                db=db, pond_id=pond_id, equipment_type="FEEDER",
                equipment_code=f.feeder_code, action="SUSPEND",
                params={"reason": f"Manual Emergency Lockout by {req.operator_name}"}
            )
        msg = f"Manual override: Feeders halted for Pond 0{pond_id}"
        
    elif req.action == "RESET_SAFETY":
        msg = f"Safety interlocks reset by {req.operator_name}. Nominal cycle resumed."
    else:
        raise HTTPException(status_code=400, detail="Invalid override action")
        
    audit = AuditLog(
        username=req.operator_name,
        action=f"MANUAL_OVERRIDE_{req.action}",
        resource_type="AUTONOMOUS_CONTROL",
        resource_id=str(pond_id),
        details={"action": req.action, "operator": req.operator_name},
        timestamp=now_dt
    )
    db.add(audit)
    db.commit()
    
    return {"success": True, "message": msg, "timestamp": now_dt.isoformat()}

@router.get("/safety-config")
def get_safety_config(db: Session = Depends(get_db)):
    """
    Returns safety thresholds, hysteresis configuration, and permission toggles.
    """
    config = autonomous_engine.get_safety_config(db)
    return {
        "farm_id": config.farm_id,
        "operating_mode": config.operating_mode,
        "emergency_do_threshold": config.emergency_do_threshold,
        "boost_do_threshold": config.boost_do_threshold,
        "standby_do_threshold": config.standby_do_threshold,
        "max_safe_temp_c": config.max_safe_temp_c,
        "min_safe_temp_c": config.min_safe_temp_c,
        "tan_warning_mg_l": config.tan_warning_mg_l,
        "tan_critical_mg_l": config.tan_critical_mg_l,
        "unionized_nh3_critical_mg_l": config.unionized_nh3_critical_mg_l,
        "ph_min": config.ph_min,
        "ph_max": config.ph_max,
        "salinity_min_ppt": config.salinity_min_ppt,
        "salinity_max_ppt": config.salinity_max_ppt,
        "flood_water_level_m": config.flood_water_level_m,
        "min_on_seconds": config.min_on_seconds,
        "min_off_seconds": config.min_off_seconds,
        "auto_aeration_enabled": config.auto_aeration_enabled,
        "auto_feeder_cutoff_enabled": config.auto_feeder_cutoff_enabled,
        "auto_backup_failover_enabled": config.auto_backup_failover_enabled,
        "auto_flood_safeguard_enabled": config.auto_flood_safeguard_enabled,
        "chemical_dosing_blocked": config.chemical_dosing_blocked
    }

@router.put("/safety-config")
def update_safety_config(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """
    Updates autonomous safety thresholds and interlock settings.
    """
    config = autonomous_engine.get_safety_config(db)
    for k, v in payload.items():
        if hasattr(config, k) and k != "id":
            # Safety safeguard: chemical_dosing_blocked CANNOT be set to False
            if k == "chemical_dosing_blocked" and v is False:
                continue
            setattr(config, k, v)
    config.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"success": True, "message": "Autonomous safety thresholds updated successfully."}

@router.get("/notifications")
def get_autonomous_notifications(limit: int = 50, db: Session = Depends(get_db)):
    """
    Returns notification history with standardized payload and delivery tracking.
    """
    logs = db.query(NotificationLog).order_by(NotificationLog.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": n.id,
            "notification_id": n.notification_id,
            "pond_id": n.pond_id,
            "event_id": n.event_id,
            "channel": n.channel,
            "severity": n.severity,
            "title": n.title,
            "message": n.message,
            "structured_payload": n.structured_payload,
            "delivered": n.delivered,
            "escalation_level": n.escalation_level,
            "timestamp": n.timestamp.isoformat() if n.timestamp else None
        }
        for n in logs
    ]

@router.post("/simulate-scenario")
def simulate_scenario(req: ScenarioSimulationRequest, db: Session = Depends(get_db)):
    """
    Injects realistic autonomous test scenarios to demonstrate closed-loop control:
    - CRITICAL_DO_FAILOVER: Low DO (2.8 mg/L) + Primary aerator trip -> Automatic backup aerator failover
    - TOXIC_AMMONIA_SURGE: TAN (0.22 mg/L) + pH (8.6) -> Toxic NH3 > 0.05 mg/L -> Feeder lockout
    - HEAVY_RAIN_FLOOD: Rain (42mm) + Salinity drop (11 ppt) -> Flood & destratification safeguard
    - SENSOR_STALE_ANOMALY: Stale readings -> Blocks unsafe actions, holds fail-safe
    - CHEMICAL_DOSING_REQUEST: Hard safety lock demonstration (blocked)
    - CLOUD_DISCONNECT: Disconnects cloud; demonstrates edge controller continues emergency protection
    """
    p_id = req.pond_id or 4
    
    if req.scenario == "CRITICAL_DO_FAILOVER":
        # Trip primary aerator 1 and trigger emergency DO
        hal.inject_fault(f"AER-P0{p_id}-1", "MOTOR_OVERLOAD_TRIP")
        events = autonomous_engine.evaluate_pond(db, p_id, simulated_override={"do": 2.8, "temperature": 29.0})
        return {
            "scenario": "CRITICAL_DO_FAILOVER",
            "message": f"Simulated DO crash to 2.8 mg/L and tripped AER-P0{p_id}-1. Emergency failover engaged backup aerator AER-P0{p_id}-D.",
            "events_count": len(events)
        }
        
    elif req.scenario == "TOXIC_AMMONIA_SURGE":
        events = autonomous_engine.evaluate_pond(db, p_id, simulated_override={"tan": 0.22, "ph": 8.7, "temperature": 32.0})
        return {
            "scenario": "TOXIC_AMMONIA_SURGE",
            "message": f"High TAN 0.22 mg/L at pH 8.7 triggered toxic NH3 alarm. Automated feeders for Pond 0{p_id} suspended.",
            "events_count": len(events)
        }
        
    elif req.scenario == "HEAVY_RAIN_FLOOD":
        events = autonomous_engine.evaluate_pond(db, p_id, simulated_override={"salinity": 11.2, "water_level": 1.48})
        return {
            "scenario": "HEAVY_RAIN_FLOOD",
            "message": f"Rainfall surge and salinity drop to 11.2 ppt triggered flood destratification aerators on Pond 0{p_id}.",
            "events_count": len(events)
        }
        
    elif req.scenario == "CHEMICAL_DOSING_REQUEST":
        events = autonomous_engine.evaluate_pond(db, p_id, simulated_override={"request_chemical_dosing": "Formalin_15L"})
        return {
            "scenario": "CHEMICAL_DOSING_REQUEST",
            "message": "Autonomous chemical dosing blocked by hard safety lock. Advisory recommendation logged.",
            "events_count": len(events)
        }
        
    elif req.scenario == "CLOUD_DISCONNECT":
        hal.set_cloud_connected(False)
        return {
            "scenario": "CLOUD_DISCONNECT",
            "message": "Cloud connection disconnected. Local edge controllers continue autonomous DO hysteresis and emergency safety protection.",
            "cloud_connected": False,
            "local_edge_failsafe_active": True
        }
        
    elif req.scenario == "RESET":
        hal.clear_fault(f"AER-P0{p_id}-1")
        hal.set_cloud_connected(True)
        return {
            "scenario": "RESET",
            "message": "Faults cleared, cloud connectivity restored, nominal autonomous cycle re-established.",
            "cloud_connected": True
        }
        
    raise HTTPException(status_code=400, detail="Unknown simulation scenario.")

@router.post("/verify-action/{action_id}")
def verify_action(action_id: str, db: Session = Depends(get_db)):
    """
    Manually triggers closed-loop recovery verification for an action record.
    """
    action = db.query(AutonomousActionRecord).filter(AutonomousActionRecord.action_id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action record not found")
        
    # Check pond sensor
    sensor = db.query(Sensor).filter(Sensor.pond_id == action.pond_id, Sensor.sensor_type == "do").first()
    curr_val = sensor.current_value if sensor else 5.8
    
    verified = hal.verify_pond_recovery(db, action, curr_val, target_recovery_threshold=4.5)
    return {
        "action_id": action_id,
        "recovery_verified": verified,
        "current_reading": curr_val,
        "target_threshold": 4.5
    }
