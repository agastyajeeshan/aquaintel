from datetime import datetime, timedelta
import random
import bcrypt
from sqlalchemy.orm import Session
from .models import (
    User, Farm, Pond, Sensor, SensorReading, Feeder, FeedingLog,
    Aerator, AerationEvent, DiseasePrediction, Alert, IoTDevice,
    CameraObservation, MaintenanceRecord, FarmSettings
)
from .core.disease_engine import disease_risk_engine

def hash_pw(pw: str) -> str:
    # Use bcrypt to hash password
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw.encode('utf-8'), salt).decode('utf-8')

def seed_database(db: Session):
    # Check if already seeded
    if db.query(Farm).first():
        return

    print("[SEED] Seeding AquaIntel Database with 10-Hectare Commercial Farm Data...")

    # 1. Users
    users_data = [
        User(username="admin", email="admin@aquaintel.io", hashed_password=hash_pw("admin123"), full_name="Dr. K. Srinivas (Agritech Director)", role="ADMIN", phone="+91 98480 11223"),
        User(username="manager", email="manager@aquaintel.io", hashed_password=hash_pw("farm123"), full_name="V. Naresh (Farm General Manager)", role="FARM_MANAGER", phone="+91 98480 22334"),
        User(username="operator", email="operator@aquaintel.io", hashed_password=hash_pw("operator123"), full_name="B. Venkat (Shift Field Lead)", role="OPERATOR", phone="+91 98480 33445"),
        User(username="viewer", email="investor@aquaintel.io", hashed_password=hash_pw("viewer123"), full_name="Rajiv Menon (Aquaculture Analyst)", role="VIEWER", phone="+91 98480 44556")
    ]
    db.add_all(users_data)
    db.commit()

    # 2. Farm
    farm = Farm(
        name="AquaIntel Commercial Delta Estate",
        location="Nellore Coastal Belt, Andhra Pradesh, India",
        total_area_ha=10.0,
        pond_count=10,
        water_source="Treated Estuarine Brackish Creek + Marine Borewell (Salinity 18-24 ppt)",
        power_backup="125 kVA Silent DG Set + 40 kW Hybrid Solar Microgrid",
        currency="INR"
    )
    db.add(farm)
    db.commit()
    db.refresh(farm)

    # 3. 10 Ponds
    pond_specs = [
        {"num": 1, "doc": 48, "biomass": 1280.0, "survival": 84.5, "status": "GREEN"},
        {"num": 2, "doc": 48, "biomass": 1250.0, "survival": 83.2, "status": "GREEN"},
        {"num": 3, "doc": 50, "biomass": 1310.0, "survival": 85.0, "status": "GREEN"},
        {"num": 4, "doc": 52, "biomass": 1180.0, "survival": 78.5, "status": "YELLOW"}, # Warning: slight low DO earlier
        {"num": 5, "doc": 35, "biomass": 920.0, "survival": 88.0, "status": "GREEN"},
        {"num": 6, "doc": 35, "biomass": 950.0, "survival": 87.4, "status": "GREEN"},
        {"num": 7, "doc": 62, "biomass": 1540.0, "survival": 81.0, "status": "GREEN"},
        {"num": 8, "doc": 65, "biomass": 1420.0, "survival": 74.0, "status": "RED"},   # Critical: ammonia spike & DO dip
        {"num": 9, "doc": 28, "biomass": 720.0, "survival": 89.5, "status": "GREEN"},
        {"num": 10, "doc": 60, "biomass": 1480.0, "survival": 82.2, "status": "GREEN"},
    ]

    sensor_types = [
        ("do", "Optical DO Probe", "mg/L", 4.0, 8.5, 5.0, 7.5),
        ("ph", "Industrial Glass pH Sensor", "pH", 7.5, 8.5, 7.8, 8.3),
        ("temperature", "PT100 RTD Submersible", "°C", 26.0, 33.0, 28.0, 31.0),
        ("salinity", "Toroidal Inductive Conductivity", "ppt", 10.0, 30.0, 16.0, 24.0),
        ("ammonia", "Ion Selective Electrode (NH3/NH4+)", "mg/L", 0.0, 0.1, 0.0, 0.05),
        ("turbidity", "Infrared Scatter Turbidity", "cm", 25.0, 45.0, 30.0, 40.0),
        ("water_level", "Ultrasonic Distance Sensor", "m", 1.0, 1.6, 1.2, 1.4),
    ]

    now = datetime.utcnow()

    for p in pond_specs:
        pond = Pond(
            farm_id=farm.id,
            pond_number=p["num"],
            name=f"Pond {p['num']:02d}",
            area_ha=1.0,
            water_volume_m3=12000.0,
            shrimp_species="Litopenaeus vannamei (Pacific White)",
            stocking_date=now - timedelta(days=p["doc"]),
            current_age_days=p["doc"],
            post_larvae_count=450000,
            estimated_biomass_kg=p["biomass"],
            survival_rate_pct=p["survival"],
            target_fcr=1.24,
            status=p["status"],
            grid_x=(p["num"] - 1) % 5,
            grid_y=(p["num"] - 1) // 5
        )
        db.add(pond)
        db.commit()
        db.refresh(pond)

        # Sensors for pond
        for stype, model, unit, smin, smax, omin, omax in sensor_types:
            # Baseline value based on status
            if p["status"] == "RED" and stype == "do":
                cval = 3.4
                s_stat = "CRITICAL"
            elif p["status"] == "RED" and stype == "ammonia":
                cval = 0.16
                s_stat = "CRITICAL"
            elif p["status"] == "YELLOW" and stype == "do":
                cval = 4.4
                s_stat = "WARNING"
            elif stype == "do":
                cval = 6.4
                s_stat = "ONLINE"
            elif stype == "ph":
                cval = 8.1
                s_stat = "ONLINE"
            elif stype == "temperature":
                cval = 29.2
                s_stat = "ONLINE"
            elif stype == "salinity":
                cval = 21.0
                s_stat = "ONLINE"
            elif stype == "ammonia":
                cval = 0.02
                s_stat = "ONLINE"
            elif stype == "turbidity":
                cval = 34.0
                s_stat = "ONLINE"
            else:
                cval = 1.25
                s_stat = "ONLINE"

            sensor = Sensor(
                pond_id=pond.id,
                sensor_type=stype,
                device_id=f"SENS-P{p['num']:02d}-{stype.upper()}",
                model=model,
                unit=unit,
                min_safe=smin,
                max_safe=smax,
                optimal_min=omin,
                optimal_max=omax,
                current_value=cval,
                status=s_stat,
                last_reading_at=now
            )
            db.add(sensor)
            db.commit()
            db.refresh(sensor)

            # Historical readings (24 data points over last 24 hours for smooth charts)
            readings = []
            for h in range(24, 0, -1):
                t_point = now - timedelta(hours=h)
                hour_of_day = (t_point.hour + t_point.minute / 60.0)
                
                # realistic diurnal curves
                if stype == "do":
                    base_h = 6.0 + 1.2 * (random.random() - 0.5)
                    val = round(base_h + 1.1 * random.uniform(0.8, 1.2) * (1.0 if 12 <= hour_of_day <= 16 else (-0.8 if 3 <= hour_of_day <= 7 else 0.2)), 2)
                    if p["status"] == "RED" and h <= 4:
                        val = round(3.2 + random.random() * 0.4, 2)
                elif stype == "temperature":
                    val = round(28.0 + (2.0 if 12 <= hour_of_day <= 16 else (-1.2 if 4 <= hour_of_day <= 7 else 0.5)) + (random.random() - 0.5) * 0.4, 1)
                elif stype == "ph":
                    val = round(7.9 + (0.3 if 13 <= hour_of_day <= 17 else -0.2) + (random.random() - 0.5) * 0.1, 2)
                elif stype == "salinity":
                    val = round(21.0 + (random.random() - 0.5) * 0.6, 1)
                elif stype == "ammonia":
                    val = round(0.025 + (random.random() - 0.5) * 0.008, 3)
                    if p["status"] == "RED" and h <= 6:
                        val = round(0.14 + random.random() * 0.03, 3)
                elif stype == "turbidity":
                    val = round(33.0 + (random.random() - 0.5) * 2.0, 1)
                else:
                    val = 1.25

                readings.append(SensorReading(
                    sensor_id=sensor.id,
                    pond_id=pond.id,
                    sensor_type=stype,
                    value=val,
                    unit=unit,
                    status="CRITICAL" if (stype == "do" and val < 3.8) or (stype == "ammonia" and val > 0.12) else "NORMAL",
                    is_simulated=True,
                    timestamp=t_point
                ))
            db.add_all(readings)

        # Feeders
        feeder = Feeder(
            pond_id=pond.id,
            feeder_code=f"FEEDER-P{p['num']:02d}",
            name=f"Solar Smart Feeder P{p['num']:02d}",
            status="STANDBY" if p["status"] != "RED" else "ERROR",
            hopper_capacity_kg=120.0,
            current_feed_level_kg=85.0 - (p['num'] * 2.5),
            feed_type="High-Pro Grower 38% Pellet (1.8mm)",
            feeding_mode="SMART_AUTO",
            daily_quota_kg=round(p["biomass"] * 0.035, 1),
            dispensed_today_kg=round(p["biomass"] * 0.022, 1),
            next_feeding_time="17:00 IST",
            is_active=True
        )
        db.add(feeder)
        db.commit()
        db.refresh(feeder)

        # Feeding Log
        feed_log = FeedingLog(
            pond_id=pond.id,
            feeder_id=feeder.id,
            amount_kg=12.5,
            planned_amount_kg=15.0,
            reduction_reason="Reduced by 16% due to high afternoon water temperature (32.4°C)" if p["status"] != "RED" else "SAFETY CUTOFF: Zero feed dispensed due to low DO and ammonia peak.",
            do_at_feeding=6.1 if p["status"] != "RED" else 3.5,
            temp_at_feeding=31.8,
            feeding_response_score=8.2 if p["status"] != "RED" else 3.5,
            status="COMPLETED" if p["status"] != "RED" else "CANCELLED",
            timestamp=now - timedelta(hours=3)
        )
        db.add(feed_log)

        # Aerators (4 aerators per pond)
        aerator_types = [
            (f"AER-P{p['num']:02d}-1", "Paddlewheel 4-Blade Primary", "paddlewheel", 1.5, "RUNNING" if p["status"] in ["RED", "YELLOW"] else "STANDBY"),
            (f"AER-P{p['num']:02d}-2", "Paddlewheel 4-Blade Secondary", "paddlewheel", 1.5, "RUNNING" if p["status"] == "RED" else "STANDBY"),
            (f"AER-P{p['num']:02d}-3", "Long-Arm Spiral Jet Aerator", "spiral", 2.2, "RUNNING" if p["status"] == "RED" else "STANDBY"),
            (f"AER-P{p['num']:02d}-4", "Submersible Venturi Injector", "venturi", 1.5, "STANDBY"),
        ]
        for acode, aname, atype, akw, astat in aerator_types:
            aerator = Aerator(
                pond_id=pond.id,
                aerator_code=acode,
                name=aname,
                aerator_type=atype,
                power_rating_kw=akw,
                status=astat,
                mode="SMART_HYSTERESIS",
                runtime_hours_today=round(4.0 + random.random() * 4.0, 1),
                total_kwh_today=round(akw * (4.0 + random.random() * 4.0), 2)
            )
            db.add(aerator)
            db.commit()
            db.refresh(aerator)

            # Aeration Event
            if astat == "RUNNING":
                db.add(AerationEvent(
                    pond_id=pond.id,
                    aerator_id=aerator.id,
                    action="START",
                    trigger_reason=f"Automated DO threshold response ({'Emergency Level' if p['status']=='RED' else 'Sub-optimal reading'}).",
                    trigger_do_level=3.6 if p["status"] == "RED" else 4.6,
                    duration_minutes=45.0,
                    timestamp=now - timedelta(minutes=45)
                ))

        # Disease Predictions
        for dis in ["WSSV", "Vibriosis", "EMS_AHPND"]:
            risk_calc = disease_risk_engine.evaluate_risk(
                disease_key=dis,
                do_mg_l=3.4 if p["status"] == "RED" else 6.4,
                temp_c=29.5,
                ph=8.2,
                ammonia_mg_l=0.15 if p["status"] == "RED" else 0.02,
                salinity_ppt=21.0,
                doc=p["doc"],
                feeding_reduction_pct=50.0 if p["status"] == "RED" else 0.0
            )
            db.add(DiseasePrediction(
                pond_id=pond.id,
                disease_name=risk_calc["disease_name"],
                risk_score=risk_calc["risk_score"],
                risk_level=risk_calc["risk_level"],
                contributors=risk_calc["contributors"],
                explanation=risk_calc["explanations"][0] if risk_calc["explanations"] else "Normal environmental conditions",
                recommendations=risk_calc["recommendations"],
                is_demo=True,
                timestamp=now
            ))

        # IoT Device for pond
        db.add(IoTDevice(
            device_id=f"ESP32-P{p['num']:02d}",
            pond_id=pond.id,
            device_type="ESP32_Pond_Master",
            status="ONLINE" if p["num"] != 9 else "WARNING",
            battery_pct=92.0 - (p['num'] * 2.0),
            signal_rssi_dbm=-65 - p['num'],
            signal_quality="EXCELLENT" if p['num'] <= 5 else "GOOD",
            firmware_version="v2.4.1-rc3",
            ip_address=f"192.168.1.{100 + p['num']}",
            uptime_hours=180.0 + p['num'] * 12.0,
            last_seen=now - timedelta(seconds=random.randint(2, 25))
        ))

    # Gateway Device
    db.add(IoTDevice(
        device_id="GW-LORA-CENTRAL-01",
        pond_id=None,
        device_type="LoRa_Gateway",
        status="ONLINE",
        battery_pct=100.0,
        signal_rssi_dbm=-48,
        signal_quality="EXCELLENT",
        firmware_version="v3.1.0-gateway",
        ip_address="192.168.1.1",
        uptime_hours=720.0,
        last_seen=now
    ))

    # Seed Alerts
    alerts_data = [
        Alert(
            pond_id=8,
            alert_type="LOW_DO",
            severity="CRITICAL",
            title="Pond 08: Critical Dissolved Oxygen Crash (3.4 mg/L)",
            description="DO dropped below 3.8 mg/L safety threshold. Emergency aeration cascade initiated across all 4 aerators.",
            cause="Night-time algae respiration combined with elevated biomass (1,420 kg).",
            recommended_action="Keep all aerators on continuous override; withhold morning feeding until DO reaches 5.5 mg/L.",
            status="ACTIVE",
            created_at=now - timedelta(minutes=28)
        ),
        Alert(
            pond_id=8,
            alert_type="HIGH_AMMONIA",
            severity="HIGH",
            title="Pond 08: Elevated Toxic Ammonia (0.16 mg/L)",
            description="Unionized NH3 exceeded safe biological threshold of 0.10 mg/L.",
            cause="Organic accumulation and unassimilated nitrogen at pond center.",
            recommended_action="Apply 5 kg Nitrosomonas/Nitrobacter bio-culture; reduce next feed ration by 50%.",
            status="ACTIVE",
            created_at=now - timedelta(hours=1, minutes=15)
        ),
        Alert(
            pond_id=4,
            alert_type="TEMP_SPIKE",
            severity="WARNING",
            title="Pond 04: Afternoon Water Temperature Warning (32.8°C)",
            description="Pond water temperature elevated above optimal 31.0°C range.",
            cause="Intense solar radiation without cloud cover during 13:00-15:00 window.",
            recommended_action="Turn on spiral jet aerator to circulate deeper thermal layers.",
            status="ACTIVE",
            created_at=now - timedelta(hours=2)
        ),
        Alert(
            pond_id=9,
            alert_type="DEVICE_BATTERY",
            severity="WARNING",
            title="ESP32-P09: Backup Battery Warning (24%)",
            description="Telemetry node solar charging panel efficiency reduced due to dust accumulation.",
            cause="Dust on photovoltaic cell.",
            recommended_action="Clean solar panel glass surface on Pond 09 node post.",
            status="ACKNOWLEDGED",
            acknowledged_by="V. Naresh",
            created_at=now - timedelta(hours=4)
        ),
        Alert(
            pond_id=2,
            alert_type="FEEDER_JAM",
            severity="INFO",
            title="Pond 02: Feeder 02 Dispenser Cycle Completed",
            description="Morning feed ration 18.5 kg dispensed successfully without hopper blockage.",
            cause="Regular automated schedule.",
            recommended_action="None required.",
            status="RESOLVED",
            resolved_by="B. Venkat",
            created_at=now - timedelta(hours=8),
            resolved_at=now - timedelta(hours=7, minutes=45)
        ),
    ]
    db.add_all(alerts_data)

    # Maintenance Records
    maintenance_data = [
        MaintenanceRecord(
            equipment_type="Aerator",
            equipment_code="AER-P04-1",
            pond_id=4,
            title="Gearbox Oil Change & Bushing Greasing",
            priority="MEDIUM",
            scheduled_date=now + timedelta(days=2),
            status="PENDING",
            technician="Ramesh Kumar (Chief Tech)",
            notes="Quarterly preventive maintenance for 2HP helical gearbox.",
            cost_inr=1200.0
        ),
        MaintenanceRecord(
            equipment_type="Sensor",
            equipment_code="SENS-P08-DO",
            pond_id=8,
            title="Optical DO Cap Membrane Calibration & Cleaning",
            priority="HIGH",
            scheduled_date=now + timedelta(days=1),
            status="PENDING",
            technician="Suresh Aqua (Instrumentation)",
            notes="Zero-point check in sodium sulfite solution + 100% air calibration.",
            cost_inr=850.0
        ),
        MaintenanceRecord(
            equipment_type="Generator",
            equipment_code="GEN-125KVA-01",
            pond_id=None,
            title="Silent DG Set Diesel Filter & Battery Check",
            priority="LOW",
            scheduled_date=now + timedelta(days=7),
            status="PENDING",
            technician="Kirloskar Service Engineer",
            notes="Routine 250-hour engine health check.",
            cost_inr=4500.0
        )
    ]
    db.add_all(maintenance_data)

    # Initial Farm Settings
    farm_settings = FarmSettings(
        farm_id=farm.id,
        setting_key="thresholds",
        setting_value={
            "do_emergency_threshold": 3.8,
            "do_boost_threshold": 4.8,
            "do_standby_threshold": 6.8,
            "temp_max_threshold": 33.5,
            "ammonia_warning_threshold": 0.08,
            "hysteresis_minutes": 10,
            "sms_alerts_enabled": True,
            "whatsapp_alerts_enabled": True,
            "auto_emergency_aeration": True,
            "auto_feeding_cutoff": True
        }
    )
    db.add(farm_settings)

    db.commit()
    print("[SUCCESS] Seed complete! 10 ponds, 70 sensors, 40 aerators, 10 feeders, alerts, and IoT nodes initialized.")
