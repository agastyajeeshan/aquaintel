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
