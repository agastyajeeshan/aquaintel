from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserRegister(BaseModel):
    username: str
    email: str
    password: str
    full_name: Optional[str] = None
    role: Optional[str] = "OPERATOR"

class SensorReadingBase(BaseModel):
    sensor_type: str
    value: float
    unit: str
    status: Optional[str] = "NORMAL"

class FeederCommand(BaseModel):
    action: str  # "START", "STOP", "SCHEDULE", "SET_RATE"
    amount_kg: Optional[float] = None
    schedule_time: Optional[str] = None

class AeratorCommand(BaseModel):
    action: str  # "START", "STOP", "EMERGENCY_OVERRIDE", "AUTO"
    mode: Optional[str] = None

class InjectEventRequest(BaseModel):
    pond_id: int
    event_type: str  # "LOW_DO", "HIGH_AMMONIA", "TEMP_SPIKE", "SENSOR_FAILURE", "CLEAR"

class OfflineToggleRequest(BaseModel):
    offline: bool

class ROIInputs(BaseModel):
    scenario: str = "base"  # "conservative", "base", "optimistic"
    farm_area_ha: float = 10.0
    ponds_count: int = 10
    annual_crops: float = 2.5
    yield_per_ha_crop_kg: float = 7500.0  # 7.5 MT/ha/crop
    shrimp_sale_price_inr_kg: float = 420.0
    feed_price_inr_kg: float = 88.0
    current_fcr: float = 1.45
    target_fcr: float = 1.25
    power_cost_per_kwh_inr: float = 7.50
    laborers_count: int = 12
    labor_salary_monthly_inr: float = 18000.0
    disease_loss_rate_traditional_pct: float = 18.0
    disease_loss_rate_aquaintel_pct: float = 4.5
    iot_capex_per_ha_inr: float = 220000.0
