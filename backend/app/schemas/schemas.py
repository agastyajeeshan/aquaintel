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

class TelemetryReadings(BaseModel):
    do_mg_l: Optional[float] = None
    ph: Optional[float] = None
    temperature_c: Optional[float] = None
    ammonia_mg_l: Optional[float] = None
    salinity_ppt: Optional[float] = None
    turbidity_cm: Optional[float] = None
    water_level_m: Optional[float] = None

class SensorStatusMap(BaseModel):
    do: Optional[str] = "OK"
    ph: Optional[str] = "OK"
    temperature: Optional[str] = "OK"
    ammonia: Optional[str] = "OK"
    salinity: Optional[str] = "OK"
    turbidity: Optional[str] = "OK"
    water_level: Optional[str] = "OK"

class TelemetryIngestRequest(BaseModel):
    schema_version: str = "1.0"
    message_id: str
    device_id: str
    farm_id: Optional[str] = "farm-01"
    pond_id: Optional[int] = 1
    timestamp: Optional[datetime] = None
    mode: Optional[str] = "SIMULATED"  # "SIMULATED", "LIVE", "TEST"
    readings: TelemetryReadings
    sensor_status: Optional[SensorStatusMap] = None

class ActuatorCommandRequest(BaseModel):
    schema_version: str = "1.0"
    command_id: Optional[str] = None
    device_id: str
    action: str  # "SET_STATE", "DISPENSE", "SET_MODE", "CALIBRATE"
    target_state: Optional[str] = None  # "ON", "OFF"
    amount_kg: Optional[float] = None
    duration_minutes: Optional[float] = None
    reason: Optional[str] = "MANUAL_COMMAND"
    mode: Optional[str] = "MANUAL"
    expires_in_seconds: Optional[int] = 300

class ActuatorCommandAckRequest(BaseModel):
    command_id: str
    device_id: str
    status: str  # "ACKNOWLEDGED", "COMPLETED", "FAILED"
    actual_state: Optional[str] = None
    error_message: Optional[str] = None

class PondCreateRequest(BaseModel):
    pond_number: int
    name: str
    area_ha: Optional[float] = 1.0
    water_volume_m3: Optional[float] = 12000.0
    shrimp_species: Optional[str] = "Litopenaeus vannamei"
    current_age_days: Optional[int] = 1
    post_larvae_count: Optional[int] = 450000
    estimated_biomass_kg: Optional[float] = 100.0
    target_fcr: Optional[float] = 1.25
    notes: Optional[str] = None

class PondUpdateRequest(BaseModel):
    name: Optional[str] = None
    area_ha: Optional[float] = None
    water_volume_m3: Optional[float] = None
    shrimp_species: Optional[str] = None
    current_age_days: Optional[int] = None
    post_larvae_count: Optional[int] = None
    estimated_biomass_kg: Optional[float] = None
    survival_rate_pct: Optional[float] = None
    target_fcr: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

