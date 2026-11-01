from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from ..database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True)
    role = Column(String(30), default="FARM_MANAGER")  # ADMIN, FARM_MANAGER, OPERATOR, VIEWER
    phone = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Farm(Base):
    __tablename__ = "farms"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    location = Column(String(200), default="Nellore, Andhra Pradesh, India")
    total_area_ha = Column(Float, default=10.0)
    pond_count = Column(Integer, default=10)
    water_source = Column(String(100), default="Estuarine Creek / Treated Brackish Borewell")
    power_backup = Column(String(100), default="125 kVA Silent Diesel Generator + Solar Hybrid")
    currency = Column(String(10), default="INR")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    ponds = relationship("Pond", back_populates="farm", cascade="all, delete-orphan")

class Pond(Base):
    __tablename__ = "ponds"
    
    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"), nullable=False)
    pond_number = Column(Integer, unique=True, nullable=False)
    name = Column(String(50), nullable=False)  # e.g. "Pond 01"
    area_ha = Column(Float, default=1.0)  # 1 Hectare each
    water_volume_m3 = Column(Float, default=12000.0)  # 1.2m avg depth
    shrimp_species = Column(String(100), default="Litopenaeus vannamei")
    stocking_date = Column(DateTime, default=datetime.utcnow)
    current_age_days = Column(Integer, default=45)
    post_larvae_count = Column(Integer, default=450000)  # 45 PL/m2 density
    estimated_biomass_kg = Column(Float, default=1250.0)
    survival_rate_pct = Column(Float, default=82.5)
    target_fcr = Column(Float, default=1.25)
    status = Column(String(20), default="GREEN")  # GREEN, YELLOW, ORANGE, RED
    
    # Coordinates / Visual positioning on farm map
    grid_x = Column(Integer, default=0)
    grid_y = Column(Integer, default=0)
    
    is_archived = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    farm = relationship("Farm", back_populates="ponds")
    sensors = relationship("Sensor", back_populates="pond", cascade="all, delete-orphan")
    feeders = relationship("Feeder", back_populates="pond", cascade="all, delete-orphan")
    aerators = relationship("Aerator", back_populates="pond", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="pond", cascade="all, delete-orphan")
    disease_predictions = relationship("DiseasePrediction", back_populates="pond", cascade="all, delete-orphan")

class Sensor(Base):
    __tablename__ = "sensors"
    
    id = Column(Integer, primary_key=True, index=True)
    pond_id = Column(Integer, ForeignKey("ponds.id"), nullable=False)
    sensor_type = Column(String(50), nullable=False)  # do, ph, temperature, salinity, ammonia, turbidity, water_level
    device_id = Column(String(50), nullable=False)
    model = Column(String(100), default="Industrial Optical RS485")
    unit = Column(String(20), nullable=False)
    min_safe = Column(Float, default=4.0)
    max_safe = Column(Float, default=8.5)
    optimal_min = Column(Float, default=5.0)
    optimal_max = Column(Float, default=7.5)
    current_value = Column(Float, default=6.5)
    status = Column(String(20), default="ONLINE")  # ONLINE, WARNING, CRITICAL, OFFLINE
    last_reading_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    pond = relationship("Pond", back_populates="sensors")
    readings = relationship("SensorReading", back_populates="sensor", cascade="all, delete-orphan")

class SensorReading(Base):
    __tablename__ = "sensor_readings"
    
    id = Column(Integer, primary_key=True, index=True)
    sensor_id = Column(Integer, ForeignKey("sensors.id"), nullable=False)
    pond_id = Column(Integer, nullable=False, index=True)
    sensor_type = Column(String(50), nullable=False, index=True)
    value = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)
    status = Column(String(20), default="NORMAL")  # NORMAL, WARNING, CRITICAL
    is_simulated = Column(Boolean, default=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    sensor = relationship("Sensor", back_populates="readings")

class Feeder(Base):
    __tablename__ = "feeders"
    
    id = Column(Integer, primary_key=True, index=True)
    pond_id = Column(Integer, ForeignKey("ponds.id"), nullable=False)
    feeder_code = Column(String(50), nullable=False)  # e.g. "FEEDER-P01"
    name = Column(String(100), default="Automated Solar Feeder 01")
    status = Column(String(30), default="STANDBY")  # ONLINE, FEEDING, STANDBY, ERROR, MAINTENANCE
    hopper_capacity_kg = Column(Float, default=120.0)
    current_feed_level_kg = Column(Float, default=85.0)
    feed_type = Column(String(50), default="Grower Pellet 38% Protein (1.8mm)")
    feeding_mode = Column(String(30), default="SMART_AUTO")  # SMART_AUTO, SCHEDULED, MANUAL
    daily_quota_kg = Column(Float, default=48.0)
    dispensed_today_kg = Column(Float, default=32.5)
    next_feeding_time = Column(String(50), default="16:30 IST")
    last_dispense_time = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    pond = relationship("Pond", back_populates="feeders")
    feeding_logs = relationship("FeedingLog", back_populates="feeder", cascade="all, delete-orphan")

class FeedingLog(Base):
    __tablename__ = "feeding_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    pond_id = Column(Integer, ForeignKey("ponds.id"), nullable=False)
    feeder_id = Column(Integer, ForeignKey("feeders.id"), nullable=False)
    amount_kg = Column(Float, nullable=False)
    planned_amount_kg = Column(Float, nullable=False)
    reduction_reason = Column(String(255), nullable=True)  # e.g. "Reduced 20% due to DO below 4.8 mg/L"
    do_at_feeding = Column(Float, nullable=True)
    temp_at_feeding = Column(Float, nullable=True)
    feeding_response_score = Column(Float, default=8.5)  # 1-10 acoustic/tray response
    status = Column(String(30), default="COMPLETED")  # COMPLETED, REDUCED, SKIPPED, CANCELLED
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    feeder = relationship("Feeder", back_populates="feeding_logs")

class Aerator(Base):
    __tablename__ = "aerators"
    
    id = Column(Integer, primary_key=True, index=True)
    pond_id = Column(Integer, ForeignKey("ponds.id"), nullable=False)
    aerator_code = Column(String(50), nullable=False)  # e.g. "AER-P01-A"
    name = Column(String(100), default="Paddlewheel Aerator 4-Arm")
    aerator_type = Column(String(50), default="paddlewheel")  # paddlewheel, spiral, root_blower, venturi
    power_rating_kw = Column(Float, default=1.5)  # 2 HP = ~1.5 kW
    status = Column(String(30), default="STANDBY")  # RUNNING, STANDBY, STOPPED, EMERGENCY, ERROR
    mode = Column(String(30), default="SMART_HYSTERESIS")  # SMART_HYSTERESIS, MANUAL, EMERGENCY, TIMED
    runtime_hours_today = Column(Float, default=6.5)
    total_kwh_today = Column(Float, default=9.75)
    min_on_seconds = Column(Integer, default=600)  # 10 min hysteresis
    min_off_seconds = Column(Integer, default=600)  # 10 min hysteresis
    last_state_change = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    pond = relationship("Pond", back_populates="aerators")
    events = relationship("AerationEvent", back_populates="aerator", cascade="all, delete-orphan")

class AerationEvent(Base):
    __tablename__ = "aeration_events"
    
    id = Column(Integer, primary_key=True, index=True)
    pond_id = Column(Integer, ForeignKey("ponds.id"), nullable=False)
    aerator_id = Column(Integer, ForeignKey("aerators.id"), nullable=False)
    action = Column(String(30), nullable=False)  # START, STOP, EMERGENCY_OVERRIDE, HYSTERESIS_HOLD
    trigger_reason = Column(String(255), nullable=False)
    trigger_do_level = Column(Float, nullable=True)
    duration_minutes = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    aerator = relationship("Aerator", back_populates="events")

class DiseasePrediction(Base):
    __tablename__ = "disease_predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    pond_id = Column(Integer, ForeignKey("ponds.id"), nullable=False)
    disease_name = Column(String(100), nullable=False)  # WSSV, Vibriosis, EMS/AHPND
    risk_score = Column(Float, nullable=False)  # 0 to 100
    risk_level = Column(String(20), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    contributors = Column(JSON, nullable=False)  # {"low_do": 25, "temp_instability": 20, ...}
    explanation = Column(Text, nullable=False)
    recommendations = Column(JSON, nullable=False)  # ["Increase aeration", "Reduce feed by 30%"]
    is_demo = Column(Boolean, default=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    pond = relationship("Pond", back_populates="disease_predictions")

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    pond_id = Column(Integer, ForeignKey("ponds.id"), nullable=True)
    alert_type = Column(String(50), nullable=False)  # LOW_DO, HIGH_AMMONIA, PH_DEV, TEMP_SPIKE, SENSOR_FAULT, DISEASE_RISK
    severity = Column(String(20), nullable=False)  # INFO, WARNING, HIGH, CRITICAL
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    cause = Column(String(255), nullable=True)
    recommended_action = Column(String(255), nullable=True)
    status = Column(String(20), default="ACTIVE")  # ACTIVE, ACKNOWLEDGED, RESOLVED, IGNORED
    acknowledged_by = Column(String(100), nullable=True)
    resolved_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    resolved_at = Column(DateTime, nullable=True)
    
    pond = relationship("Pond", back_populates="alerts")

class IoTDevice(Base):
    __tablename__ = "iot_devices"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(50), unique=True, nullable=False)  # e.g. "ESP32-P01", "GW-LORA-CENTRAL"
    pond_id = Column(Integer, nullable=True)
    device_type = Column(String(50), nullable=False)  # ESP32_Pond_Master, LoRa_Gateway, Multi_Probe_Node, Smart_Feeder_RTU
    status = Column(String(20), default="ONLINE")  # ONLINE, WARNING, OFFLINE
    battery_pct = Column(Float, default=95.0)
    signal_rssi_dbm = Column(Integer, default=-68)
    signal_quality = Column(String(20), default="GOOD")  # EXCELLENT, GOOD, FAIR, POOR
    firmware_version = Column(String(30), default="v2.4.1-rc3")
    ip_address = Column(String(50), default="192.168.1.101")
    uptime_hours = Column(Float, default=248.5)
    last_seen = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

class CameraObservation(Base):
    __tablename__ = "camera_observations"
    
    id = Column(Integer, primary_key=True, index=True)
    pond_id = Column(Integer, nullable=False)
    image_url = Column(String(255), nullable=False)
    sample_type = Column(String(50), default="tray_inspection")  # tray_inspection, water_surface, gut_check
    detected_category = Column(String(50), nullable=False)  # shrimp_activity, dead_shrimp, uneaten_feed, visual_abnormalities
    confidence_score = Column(Float, default=0.92)
    shrimp_count = Column(Integer, default=42)
    activity_level = Column(String(30), default="VIGOROUS")  # VIGOROUS, NORMAL, LETHARGIC
    uneaten_feed_detected = Column(Boolean, default=False)
    dead_shrimp_count = Column(Integer, default=0)
    abnormalities_detected = Column(JSON, default=list)  # ["White spot on carapace", "Empty gut syndrome"]
    notes = Column(Text, default="Healthy gut fullness and active feeding response noted.")
    disclaimer = Column(String(255), default="Computer vision provides preliminary observation only. Laboratory confirmation is required for disease diagnosis.")
    timestamp = Column(DateTime, default=datetime.utcnow)

class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"
    
    id = Column(Integer, primary_key=True, index=True)
    equipment_type = Column(String(50), nullable=False)  # Aerator, Feeder, Sensor, Generator, Pump
    equipment_code = Column(String(50), nullable=False)
    pond_id = Column(Integer, nullable=True)
    title = Column(String(150), nullable=False)
    priority = Column(String(20), default="MEDIUM")  # LOW, MEDIUM, HIGH, URGENT
    scheduled_date = Column(DateTime, nullable=False)
    completed_date = Column(DateTime, nullable=True)
    status = Column(String(30), default="PENDING")  # PENDING, IN_PROGRESS, COMPLETED
    technician = Column(String(100), default="Ramesh Kumar (Chief Tech)")
    notes = Column(Text, nullable=True)
    cost_inr = Column(Float, default=1500.0)

class FarmSettings(Base):
    __tablename__ = "farm_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, default=1)
    setting_key = Column(String(100), unique=True, nullable=False)
    setting_value = Column(JSON, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow)

class DeviceCommand(Base):
    __tablename__ = "device_commands"

    id = Column(Integer, primary_key=True, index=True)
    command_id = Column(String(64), unique=True, index=True, nullable=False)
    device_id = Column(String(50), nullable=False, index=True)
    pond_id = Column(Integer, nullable=True)
    action = Column(String(50), nullable=False)  # SET_STATE, DISPENSE, SET_MODE, CALIBRATE, RESTART
    payload = Column(JSON, default=dict)
    status = Column(String(30), default="PENDING")  # PENDING, SENT, ACKNOWLEDGED, COMPLETED, FAILED, EXPIRED
    reason = Column(String(255), nullable=True)
    mode = Column(String(30), default="AUTO")
    issued_at = Column(DateTime, default=datetime.utcnow, index=True)
    expires_at = Column(DateTime, nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(String(255), nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    username = Column(String(50), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String(50), nullable=True)
    details = Column(JSON, default=dict)
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

class IngestedTelemetry(Base):
    __tablename__ = "ingested_telemetry"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(String(64), unique=True, index=True, nullable=False)
    device_id = Column(String(50), nullable=False, index=True)
    farm_id = Column(String(50), nullable=True)
    pond_id = Column(Integer, nullable=True, index=True)
    mode = Column(String(30), default="SIMULATED")  # SIMULATED, LIVE, TEST
    payload = Column(JSON, nullable=False)
    received_at = Column(DateTime, default=datetime.utcnow, index=True)

class WeatherObservation(Base):
    __tablename__ = "weather_observations"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"), nullable=True)
    air_temperature_c = Column(Float, nullable=False)
    relative_humidity_pct = Column(Float, nullable=False)
    rainfall_mm = Column(Float, default=0.0)
    wind_speed_kmh = Column(Float, default=0.0)
    wind_direction_deg = Column(Float, default=0.0)
    cloud_cover_pct = Column(Float, default=0.0)
    solar_radiation_wm2 = Column(Float, default=0.0)
    atmospheric_pressure_hpa = Column(Float, default=1013.25)
    weather_code = Column(Integer, default=0)
    weather_description = Column(String(100), default="Clear")
    provider_name = Column(String(100), default="Open-Meteo")
    is_simulated = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

class WeatherForecast(Base):
    __tablename__ = "weather_forecasts"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"), nullable=True)
    horizon_hours = Column(Integer, nullable=False)
    target_timestamp = Column(DateTime, nullable=False, index=True)
    air_temperature_c = Column(Float, nullable=False)
    relative_humidity_pct = Column(Float, nullable=False)
    rainfall_mm = Column(Float, default=0.0)
    rainfall_probability_pct = Column(Float, default=0.0)
    solar_radiation_wm2 = Column(Float, default=0.0)
    provider_name = Column(String(100), default="Open-Meteo")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class ClimateAdaptationEvent(Base):
    __tablename__ = "climate_adaptation_events"

    id = Column(Integer, primary_key=True, index=True)
    pond_id = Column(Integer, ForeignKey("ponds.id"), nullable=False, index=True)
    condition_key = Column(String(50), nullable=False, index=True)  # SUMMER_RAIN, RAINY_SUNSHINE, HEAVY_RAIN, HOT_AFTERNOON, COLD_SNAP
    title = Column(String(150), nullable=False)
    severity = Column(String(20), default="NORMAL")  # NORMAL, WARNING, HIGH, CRITICAL
    detected_stressors = Column(JSON, default=list)
    aeration_action = Column(String(100), nullable=False)
    feeding_action = Column(String(100), nullable=False)
    feed_adjustment_pct = Column(Float, default=0.0)
    recommendations = Column(JSON, default=list)
    operator_approved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class PondForecastRecord(Base):
    __tablename__ = "pond_forecast_records"

    id = Column(Integer, primary_key=True, index=True)
    pond_id = Column(Integer, ForeignKey("ponds.id"), nullable=False, index=True)
    horizon_hours = Column(Integer, nullable=False)  # 3, 6, 12, 24, 72, 168
    target_timestamp = Column(DateTime, nullable=False, index=True)
    predicted_metrics = Column(JSON, nullable=False)
    uncertainty_bounds = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class AutomationSafetyConfig(Base):
    __tablename__ = "automation_safety_configs"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, default=1, index=True)
    operating_mode = Column(String(30), default="AUTOMATIC_SAFETY", nullable=False)  # MONITOR, ASSISTED, AUTOMATIC_SAFETY, FULL_AUTOMATION
    
    # Critical Safety Thresholds
    emergency_do_threshold = Column(Float, default=3.8)  # mg/L
    boost_do_threshold = Column(Float, default=4.8)      # mg/L
    standby_do_threshold = Column(Float, default=6.8)    # mg/L
    max_safe_temp_c = Column(Float, default=33.5)        # °C
    min_safe_temp_c = Column(Float, default=26.0)        # °C
    tan_warning_mg_l = Column(Float, default=0.08)       # mg/L
    tan_critical_mg_l = Column(Float, default=0.15)      # mg/L
    unionized_nh3_critical_mg_l = Column(Float, default=0.05)  # Emerson formula
    ph_min = Column(Float, default=7.5)
    ph_max = Column(Float, default=8.5)
    salinity_min_ppt = Column(Float, default=12.0)
    salinity_max_ppt = Column(Float, default=28.0)
    flood_water_level_m = Column(Float, default=1.45)    # meters
    
    # Hysteresis & Motor Interlocks
    min_on_seconds = Column(Integer, default=600)        # 10 min
    min_off_seconds = Column(Integer, default=600)       # 10 min
    cooldown_seconds = Column(Integer, default=300)      # 5 min
    
    # Autonomous Permissions
    auto_aeration_enabled = Column(Boolean, default=True)
    auto_feeder_cutoff_enabled = Column(Boolean, default=True)
    auto_backup_failover_enabled = Column(Boolean, default=True)
    auto_flood_safeguard_enabled = Column(Boolean, default=True)
    auto_water_exchange_enabled = Column(Boolean, default=False)  # Requires explicit commissioning
    chemical_dosing_blocked = Column(Boolean, default=True)      # HARD SAFETY LOCK: Never automatic
    
    # Audit & Status
    last_mode_change_at = Column(DateTime, default=datetime.utcnow)
    changed_by_user = Column(String(100), default="Dr. K. Srinivas (Chief Agritech Director)")
    updated_at = Column(DateTime, default=datetime.utcnow)

class AutonomousDecisionEvent(Base):
    __tablename__ = "autonomous_decision_events"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(64), unique=True, index=True, nullable=False)
    pond_id = Column(Integer, ForeignKey("ponds.id"), nullable=False, index=True)
    severity = Column(String(20), nullable=False, default="NORMAL")  # NORMAL, ADVISORY, WARNING, CRITICAL, EMERGENCY
    condition_type = Column(String(60), nullable=False, index=True)
    # e.g. LOW_DO_HYPOXIA, UNSAFE_FEEDING_TEMP, UNSAFE_FEEDING_TAN, HIGH_TOXIC_AMMONIA,
    # HEAVY_RAIN_FLOOD, AERATOR_TRIP_FAILOVER, SENSOR_ANOMALY_STALE, DISEASE_VULNERABILITY_SPIKE
    
    title = Column(String(150), nullable=False)
    trigger_parameters = Column(JSON, default=dict)      # Raw measurements & threshold breaches
    multi_parameter_analysis = Column(JSON, default=dict) # Calculated indexes: NH3, thermal-DO coupling, etc.
    weather_context = Column(JSON, default=dict)         # Temperature, rainfall, solar radiation
    decision_rationale = Column(Text, nullable=False)    # Deterministic rule explanation
    selected_action = Column(String(100), nullable=False)
    action_mode = Column(String(30), default="AUTOMATIC") # AUTOMATIC, ADVISORY_ONLY, BLOCKED_BY_SAFETY
    is_executed = Column(Boolean, default=False)
    status = Column(String(30), default="DETECTED")      # DETECTED, ACTION_EXECUTED, RECOVERY_VERIFIED, FAILED, ESCALATED
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class AutonomousActionRecord(Base):
    __tablename__ = "autonomous_action_records"

    id = Column(Integer, primary_key=True, index=True)
    action_id = Column(String(64), unique=True, index=True, nullable=False)
    decision_event_id = Column(String(64), ForeignKey("autonomous_decision_events.event_id"), nullable=True)
    pond_id = Column(Integer, nullable=False, index=True)
    equipment_type = Column(String(50), nullable=False)   # AERATOR, BACKUP_AERATOR, FEEDER, DRAIN_VALVE, PUMP
    equipment_code = Column(String(50), nullable=False)
    command_action = Column(String(50), nullable=False)   # START, STOP, CASCADE_ALL, SUSPEND, RESUME, FAILOVER_BACKUP
    command_id = Column(String(64), nullable=True)
    parameters = Column(JSON, default=dict)
    
    dispatched_at = Column(DateTime, default=datetime.utcnow, index=True)
    equipment_ack_at = Column(DateTime, nullable=True)
    equipment_ack_status = Column(String(30), default="PENDING")  # PENDING, ACKNOWLEDGED, MOTOR_FAULT_TRIPPED, TIMEOUT
    
    # Closed-Loop Verification
    recovery_verified = Column(Boolean, default=False)
    recovery_verified_at = Column(DateTime, nullable=True)
    recovery_telemetry = Column(JSON, default=dict)       # Reading confirming normalization
    notes = Column(Text, nullable=True)

class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    notification_id = Column(String(64), unique=True, index=True, nullable=False)
    pond_id = Column(Integer, nullable=True, index=True)
    event_id = Column(String(64), nullable=True, index=True)
    channel = Column(String(30), default="IN_APP")       # IN_APP, DASHBOARD, PUSH, SMS, EMAIL, VOICE
    severity = Column(String(20), default="INFO")        # INFO, ADVISORY, WARNING, CRITICAL, EMERGENCY
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    structured_payload = Column(JSON, default=dict)      # Exact readings, thresholds, timestamps, actions
    delivered = Column(Boolean, default=True)
    delivery_status = Column(String(30), default="DELIVERED")
    dedup_hash = Column(String(64), nullable=True, index=True)
    escalation_level = Column(Integer, default=1)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)



