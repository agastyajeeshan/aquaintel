from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, Body, Query, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Farm, FarmSettings, User, AuditLog, SensorReading, Alert
from ..core.iot_simulator import iot_simulator
from ..core.security import get_current_user_optional
from ..config import settings as app_settings

router = APIRouter(prefix="/settings", tags=["Settings"])

DEFAULT_SETTINGS = {
    "do_emergency_threshold": 3.8,
    "do_boost_threshold": 4.8,
    "do_standby_threshold": 6.8,
    "temp_max_threshold": 33.5,
    "temp_min_threshold": 26.0,
    "ammonia_warning_threshold": 0.08,
    "ph_min_threshold": 7.5,
    "ph_max_threshold": 8.5,
    "hysteresis_minutes": 10,
    "auto_emergency_aeration": True,
    "auto_feeding_cutoff": True,
    "notifications": {
        "in_app": True,
        "email": True,
        "sms": True,
        "whatsapp": True,
        "min_severity": "WARNING"
    }
}

@router.get("")
def get_farm_settings(db: Session = Depends(get_db)):
    farm = db.query(Farm).first()
    setting_record = db.query(FarmSettings).filter(FarmSettings.setting_key == "thresholds").first()
    base_settings = dict(setting_record.setting_value) if setting_record else dict(DEFAULT_SETTINGS)
    if farm:
        base_settings["farm_name"] = farm.name
        base_settings["location"] = farm.location
        base_settings["total_area_ha"] = farm.total_area_ha
        base_settings["total_ponds"] = farm.pond_count
    return base_settings

@router.put("")
def update_farm_settings(
    payload: dict = Body(...),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    if not app_settings.DEMO_MODE and (not current_user or current_user.role not in ["ADMIN", "FARM_MANAGER"]):
        raise HTTPException(status_code=403, detail="Administrator or Farm Manager authentication required")
    setting_record = db.query(FarmSettings).filter(FarmSettings.setting_key == "thresholds").first()
    if not setting_record:
        setting_record = FarmSettings(farm_id=1, setting_key="thresholds", setting_value=payload)
        db.add(setting_record)
    else:
        setting_record.setting_value = payload

    db.add(AuditLog(
        user_id=current_user.id if current_user else None,
        username=current_user.username if current_user else None,
        action="SETTINGS_UPDATED",
        resource_type="SETTINGS",
        resource_id="thresholds",
        details=payload
    ))
    db.commit()
    return {"status": "SUCCESS", "settings": setting_record.setting_value}

@router.get("/users")
def get_users_list(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    if not app_settings.DEMO_MODE and (not current_user or current_user.role != "ADMIN"):
        raise HTTPException(status_code=403, detail="Administrator authentication required")
    users = db.query(User).all()
    return [{
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "full_name": u.full_name,
        "role": u.role,
        "phone": u.phone,
        "is_active": u.is_active
    } for u in users]

@router.post("/reset-demo")
def reset_demo_data(db: Session = Depends(get_db)):
    """
    Resets synthetic events and simulated telemetry states back to pristine diurnal state.
    Preserves all user accounts, custom ponds, and configurations (Rule 19).
    """
    # 1. Clear simulator events
    iot_simulator.reset_all_events()
    iot_simulator.is_offline = False
    iot_simulator.offline_queue_count = 0

    # 2. Reset active simulated alerts to resolved
    db.query(Alert).filter(Alert.status == "ACTIVE").update({
        "status": "RESOLVED",
        "resolved_at": datetime.now(timezone.utc),
        "resolved_by": "SYSTEM (Demo Reset)"
    })

    # 3. Log audit event
    db.add(AuditLog(
        action="DEMO_DATA_RESET",
        resource_type="SYSTEM",
        resource_id="simulator",
        details={"message": "All stress injections cleared; natural diurnal curves restored."}
    ))
    db.commit()

    return {
        "status": "SUCCESS",
        "message": "Demo data reset complete. Normal sinusoidal diurnal cycle active."
    }

@router.get("/audit-logs")
def get_audit_logs(limit: int = Query(50, le=200), db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return [{
        "id": l.id,
        "user_id": l.user_id,
        "username": l.username,
        "action": l.action,
        "resource_type": l.resource_type,
        "resource_id": l.resource_id,
        "details": l.details,
        "timestamp": l.timestamp.isoformat() if l.timestamp else None
    } for l in logs]
