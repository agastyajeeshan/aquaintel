import math
import random
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional

class IoTSimulator:
    """
    Realistic IoT Sensor and Multi-Pond Environmental Simulator
    Supporting all 15 Required Demonstration Scenarios (Section 9):
    1. HEALTHY: Ideal biological condition
    2. GRADUAL_FALLING_DO: Slow DO decline before critical drop
    3. CRITICAL_LOW_DO: Emergency DO < 3.0 mg/L
    4. HIGH_TEMPERATURE: Heat wave > 34.5°C
    5. ABNORMAL_PH: Extreme pH fluctuation (< 7.3 or > 8.8)
    6. RISING_AMMONIA: Toxic ammonia surge > 0.16 mg/L
    7. SENSOR_DISCONNECTION: Sensor failure / NaN readings
    8. STALE_READINGS: Frozen telemetry (telemetry staleness detection)
    9. INTERNET_OUTAGE: Local edge buffering (cloud disconnected)
    10. GATEWAY_OUTAGE: LoRa gateway link offline
    11. AERATOR_FAILURE: Actuator motor trip / mechanical fault
    12. FEEDER_FAILURE: Dispenser jam / hopper motor fault
    13. ABNORMAL_FEEDING_RESPONSE: Poor feed intake (< 30% clearance)
    14. ELEVATED_DISEASE_RISK: Multi-stressor syndromic vulnerability
    15. RECOVERY: Gradual return to optimal water balance
    """

    SCENARIO_DEFINITIONS = {
        "HEALTHY": "Normal optimal biological condition with natural diurnal curves.",
        "GRADUAL_FALLING_DO": "DO declining steadily (3.8 - 4.2 mg/L) indicating rising benthic oxygen demand.",
        "CRITICAL_LOW_DO": "Emergency hypoxia (DO < 3.0 mg/L) requiring immediate maximum aeration.",
        "HIGH_TEMPERATURE": "Severe midday solar thermal shock (> 34.5°C).",
        "ABNORMAL_PH": "Dangerous pH excursion (> 8.8 or < 7.3) threatening prawn osmoregulation.",
        "RISING_AMMONIA": "Toxic unionized ammonia spike (> 0.15 mg/L) from overfeeding or unmineralized organic sludge.",
        "SENSOR_DISCONNECTION": "Edge probe telemetry loss / hardware failure.",
        "STALE_READINGS": "Frozen telemetry simulating telemetry transmission failure.",
        "INTERNET_OUTAGE": "Cloud connectivity severed; local edge controllers buffering offline.",
        "GATEWAY_OUTAGE": "Central LoRa Gateway 865.2 MHz offline.",
        "AERATOR_FAILURE": "Aerator mechanical trip / thermal breaker open.",
        "FEEDER_FAILURE": "Automated solar feeder auger jammed.",
        "ABNORMAL_FEEDING_RESPONSE": "Prawns lethargic on check trays (< 30% feed cleared).",
        "ELEVATED_DISEASE_RISK": "Triple stressor convergence (Low DO + Temp instability + Ammonia).",
        "RECOVERY": "Post-intervention recovery returning parameters to optimal safe zones.",
        "CLEAR": "Restore natural sinusoidal diurnal cycles."
    }

    def __init__(self, seed: Optional[int] = 42):
        self.random_gen = random.Random(seed)
        self.is_offline = False
        self.gateway_offline = False
        self.offline_queue_count = 0
        self.injected_events: Dict[int, Dict[str, Any]] = {}
        self.frozen_readings: Dict[int, Dict[str, Any]] = {}

        # 10 individual 1-hectare ponds baselines
        self.pond_baselines = {
            i: {
                "base_temp": 28.5 + (self.random_gen.random() - 0.5) * 0.8,
                "base_do": 6.2 + (self.random_gen.random() - 0.5) * 0.6,
                "base_ph": 8.0 + (self.random_gen.random() - 0.5) * 0.2,
                "base_salinity": 20.0 + (self.random_gen.random() - 0.5) * 1.5,
                "base_ammonia": 0.025 + (self.random_gen.random() - 0.5) * 0.01,
                "base_turbidity": 33.0 + (self.random_gen.random() - 0.5) * 3.0,
                "base_water_level": 1.25,
            }
            for i in range(1, 11)
        }

    def inject_event(self, pond_id: int, event_type: str) -> Dict[str, Any]:
        event_key = event_type.upper()
        if event_key == "CLEAR" or event_key == "HEALTHY":
            if pond_id in self.injected_events:
                del self.injected_events[pond_id]
            if pond_id in self.frozen_readings:
                del self.frozen_readings[pond_id]
            return {
                "status": "SUCCESS",
                "message": f"Pond {pond_id} restored to natural healthy diurnal conditions."
            }

        now = datetime.now(timezone.utc)
        self.injected_events[pond_id] = {
            "type": event_key,
            "description": self.SCENARIO_DEFINITIONS.get(event_key, "Custom simulation stress event"),
            "injected_at": now
        }

        # Handle global scenarios
        if event_key == "INTERNET_OUTAGE":
            self.set_offline_mode(True)
        elif event_key == "GATEWAY_OUTAGE":
            self.gateway_offline = True

        return {
            "status": "SUCCESS",
            "message": f"Injected scenario '{event_key}' into Pond {pond_id}: {self.SCENARIO_DEFINITIONS.get(event_key, '')}"
        }

    def reset_all_events(self):
        self.injected_events.clear()
        self.frozen_readings.clear()
        self.is_offline = False
        self.gateway_offline = False
        self.offline_queue_count = 0

    def set_offline_mode(self, offline: bool) -> int:
        self.is_offline = offline
        if offline:
            self.offline_queue_count += 5
            return 0
        else:
            synced = self.offline_queue_count
            self.offline_queue_count = 0
            return synced

    def generate_current_pond_readings(self, pond_id: int) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        ev_info = self.injected_events.get(pond_id)
        ev_type = ev_info["type"] if ev_info else None

        # Scenario 8: Stale readings (freeze telemetry)
        if ev_type == "STALE_READINGS" and pond_id in self.frozen_readings:
            stale_data = dict(self.frozen_readings[pond_id])
            stale_data["is_stale"] = True
            stale_data["stale_duration_minutes"] = 45
            return stale_data

        base = self.pond_baselines.get(pond_id, self.pond_baselines[1])
        hour = now.hour + (now.minute / 60.0)

        # Diurnal curves (Photosynthesis and Solar radiation)
        do_diurnal = math.sin((hour - 9) * math.pi / 12) * 1.2
        temp_diurnal = math.sin((hour - 8) * math.pi / 12) * 2.2
        ph_diurnal = math.sin((hour - 9) * math.pi / 12) * 0.25

        jitter = (self.random_gen.random() - 0.5) * 0.08

        do_val = round(max(3.5, base["base_do"] + do_diurnal + jitter), 2)
        temp_val = round(base["base_temp"] + temp_diurnal + jitter * 2, 1)
        ph_val = round(base["base_ph"] + ph_diurnal + jitter * 0.5, 2)
        salinity_val = round(base["base_salinity"] + jitter * 0.5, 1)
        ammonia_val = round(max(0.005, base["base_ammonia"] + jitter * 0.02), 3)
        turbidity_val = round(base["base_turbidity"] + jitter * 2, 1)
        water_level_val = round(base["base_water_level"] + jitter * 0.02, 2)

        sensor_status = "ONLINE"
        aerator_fault = False
        feeder_fault = False
        feeding_intake_pct = 95.0

        # Apply specific scenario modifications
        if ev_type == "CRITICAL_LOW_DO":
            do_val = round(2.6 + self.random_gen.random() * 0.3, 2)
        elif ev_type == "GRADUAL_FALLING_DO":
            do_val = round(3.9 + self.random_gen.random() * 0.2, 2)
        elif ev_type == "HIGH_TEMPERATURE":
            temp_val = round(34.8 + self.random_gen.random() * 0.6, 1)
        elif ev_type == "ABNORMAL_PH":
            ph_val = round(8.9 + self.random_gen.random() * 0.3, 2)
        elif ev_type == "RISING_AMMONIA":
            ammonia_val = round(0.18 + self.random_gen.random() * 0.04, 3)
        elif ev_type == "SENSOR_DISCONNECTION":
            sensor_status = "OFFLINE"
            do_val = 0.0
        elif ev_type == "AERATOR_FAILURE":
            aerator_fault = True
            do_val = round(3.4 + self.random_gen.random() * 0.3, 2)
        elif ev_type == "FEEDER_FAILURE":
            feeder_fault = True
        elif ev_type == "ABNORMAL_FEEDING_RESPONSE":
            feeding_intake_pct = 25.0
        elif ev_type == "ELEVATED_DISEASE_RISK":
            do_val = 3.6
            temp_val = 33.2
            ammonia_val = 0.12
        elif ev_type == "RECOVERY":
            do_val = 6.4
            temp_val = 29.2
            ammonia_val = 0.02

        if self.is_offline:
            self.offline_queue_count += 1

        # Determine pond classification status
        pond_status = "GREEN"
        if do_val < 3.2 or ammonia_val > 0.15 or temp_val > 34.2 or aerator_fault or sensor_status == "OFFLINE":
            pond_status = "RED"
        elif do_val < 4.5 or ammonia_val > 0.07 or temp_val > 32.5 or feeding_intake_pct < 50.0:
            pond_status = "YELLOW"

        reading_dict = {
            "pond_id": pond_id,
            "timestamp": now.isoformat(),
            "status": pond_status,
            "sensor_health": sensor_status,
            "data_provenance": "SYNTHETIC_SIMULATED",
            "is_stale": False,
            "metrics": {
                "do": {
                    "value": do_val,
                    "unit": "mg/L",
                    "status": "CRITICAL" if do_val < 3.2 else ("WARNING" if do_val < 4.5 else "NORMAL")
                },
                "temperature": {
                    "value": temp_val,
                    "unit": "°C",
                    "status": "CRITICAL" if temp_val > 34.2 else ("WARNING" if temp_val > 32.5 else "NORMAL")
                },
                "ph": {
                    "value": ph_val,
                    "unit": "pH",
                    "status": "CRITICAL" if (ph_val > 8.8 or ph_val < 7.2) else ("WARNING" if (ph_val > 8.5 or ph_val < 7.5) else "NORMAL")
                },
                "salinity": {"value": salinity_val, "unit": "ppt", "status": "NORMAL"},
                "ammonia": {
                    "value": ammonia_val,
                    "unit": "mg/L",
                    "status": "CRITICAL" if ammonia_val > 0.12 else ("WARNING" if ammonia_val > 0.06 else "NORMAL")
                },
                "turbidity": {"value": turbidity_val, "unit": "cm", "status": "NORMAL"},
                "water_level": {"value": water_level_val, "unit": "m", "status": "NORMAL"}
            },
            "device_faults": {
                "aerator_fault": aerator_fault,
                "feeder_fault": feeder_fault,
                "gateway_offline": self.gateway_offline
            },
            "feeding_intake_pct": feeding_intake_pct,
            "active_event": ev_type,
            "event_description": self.SCENARIO_DEFINITIONS.get(ev_type, None)
        }

        # Cache reading for stale simulation
        if ev_type == "STALE_READINGS" and pond_id not in self.frozen_readings:
            self.frozen_readings[pond_id] = reading_dict

        return reading_dict

    def generate_all_ponds_snapshot(self) -> List[Dict[str, Any]]:
        return [self.generate_current_pond_readings(p) for p in range(1, 11)]

iot_simulator = IoTSimulator()
