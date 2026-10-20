from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import FarmSettings, User

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
    setting_record = db.query(FarmSettings).filter(FarmSettings.setting_key == "thresholds").first()
    if setting_record:
        return setting_record.setting_value
    return DEFAULT_SETTINGS

@router.put("")
def update_farm_settings(payload: dict = Body(...), db: Session = Depends(get_db)):
    setting_record = db.query(FarmSettings).filter(FarmSettings.setting_key == "thresholds").first()
    if not setting_record:
        setting_record = FarmSettings(farm_id=1, setting_key="thresholds", setting_value=payload)
        db.add(setting_record)
    else:
        setting_record.setting_value = payload
    db.commit()
    return {"status": "SUCCESS", "settings": setting_record.setting_value}

@router.get("/users")
def get_users_list(db: Session = Depends(get_db)):
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
