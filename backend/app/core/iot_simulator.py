import math
import random
from datetime import datetime, timedelta
from typing import Dict, Any, List

class IoTSimulator:
    """
    Realistic IoT Sensor and Multi-Pond Environmental Simulator
    for 10-Hectare Commercial Prawn Farm
    """

    def __init__(self):
        self.is_offline = False
        self.offline_queue_count = 0
        self.injected_events: Dict[int, Dict[str, Any]] = {}
        # Pre-configured ponds 1 to 10 baseline states
        self.pond_baselines = {
            i: {
                "base_temp": 28.5 + (random.random() - 0.5) * 0.8,
                "base_do": 6.2 + (random.random() - 0.5) * 0.6,
                "base_ph": 8.0 + (random.random() - 0.5) * 0.2,
                "base_salinity": 20.0 + (random.random() - 0.5) * 1.5,
                "base_ammonia": 0.025 + (random.random() - 0.5) * 0.01,
                "base_turbidity": 33.0 + (random.random() - 0.5) * 3.0,
                "base_water_level": 1.25,
            }
            for i in range(1, 11)
        }

    def inject_event(self, pond_id: int, event_type: str) -> Dict[str, Any]:
        """
        Inject demo stress event into a specific pond
        Events:
        - "LOW_DO": Critical DO drop below 3.0 mg/L
        - "HIGH_AMMONIA": High toxic ammonia spike > 0.18 mg/L
        - "TEMP_SPIKE": Afternoon heat wave > 34.2 °C
        - "SENSOR_FAILURE": Sensor drops offline / NaN readings
        - "CLEAR": Restores normal diurnal drift
        """
        if event_type == "CLEAR":
            if pond_id in self.injected_events:
                del self.injected_events[pond_id]
            return {"status": "SUCCESS", "message": f"Pond {pond_id} restored to normal diurnal conditions"}

        self.injected_events[pond_id] = {
            "type": event_type,
            "injected_at": datetime.utcnow()
        }
        return {"status": "SUCCESS", "message": f"Injected '{event_type}' into Pond {pond_id}"}

    def reset_all_events(self):
        self.injected_events.clear()

    def set_offline_mode(self, offline: bool):
        self.is_offline = offline
        if offline:
            self.offline_queue_count += 5
        else:
            synced = self.offline_queue_count
            self.offline_queue_count = 0
            return synced
        return 0

    def generate_current_pond_readings(self, pond_id: int) -> Dict[str, Any]:
        base = self.pond_baselines.get(pond_id, self.pond_baselines[1])
        now = datetime.utcnow()
        hour = now.hour + (now.minute / 60.0)

        # Diurnal curves (Photosynthesis and Solar radiation)
        # DO peaks at 15:00, lowest at 05:00
        do_diurnal = math.sin((hour - 9) * math.pi / 12) * 1.2
        # Temperature peaks at 14:00, lowest at 06:00
        temp_diurnal = math.sin((hour - 8) * math.pi / 12) * 2.2
        # pH peaks at 15:00 with CO2 consumption
        ph_diurnal = math.sin((hour - 9) * math.pi / 12) * 0.25

        # Normal small jitter
        jitter = (random.random() - 0.5) * 0.08

        do_val = round(max(3.2, base["base_do"] + do_diurnal + jitter), 2)
        temp_val = round(base["base_temp"] + temp_diurnal + jitter * 2, 1)
        ph_val = round(base["base_ph"] + ph_diurnal + jitter * 0.5, 2)
        salinity_val = round(base["base_salinity"] + jitter * 0.5, 1)
        ammonia_val = round(max(0.005, base["base_ammonia"] + jitter * 0.02), 3)
        turbidity_val = round(base["base_turbidity"] + jitter * 2, 1)
        water_level_val = round(base["base_water_level"] + jitter * 0.02, 2)

        sensor_status = "ONLINE"

        # Apply Injected Events if active
        if pond_id in self.injected_events:
            ev_type = self.injected_events[pond_id]["type"]
            if ev_type == "LOW_DO":
                do_val = round(2.8 + random.random() * 0.4, 2)
            elif ev_type == "HIGH_AMMONIA":
                ammonia_val = round(0.18 + random.random() * 0.04, 3)
            elif ev_type == "TEMP_SPIKE":
                temp_val = round(34.8 + random.random() * 0.6, 1)
            elif ev_type == "SENSOR_FAILURE":
                sensor_status = "OFFLINE"
                do_val = 0.0

        if self.is_offline:
            self.offline_queue_count += 1

        # Classify overall pond status
        pond_status = "GREEN"
        if do_val < 3.8 or ammonia_val > 0.15 or temp_val > 34.0:
            pond_status = "RED"
        elif do_val < 4.8 or ammonia_val > 0.08 or temp_val > 32.5:
            pond_status = "YELLOW"

        return {
            "pond_id": pond_id,
            "timestamp": now.isoformat(),
            "status": pond_status,
            "sensor_health": sensor_status,
            "metrics": {
                "do": {"value": do_val, "unit": "mg/L", "status": "CRITICAL" if do_val < 3.8 else ("WARNING" if do_val < 4.8 else "NORMAL")},
                "temperature": {"value": temp_val, "unit": "°C", "status": "WARNING" if temp_val > 32.5 else "NORMAL"},
                "ph": {"value": ph_val, "unit": "pH", "status": "WARNING" if ph_val > 8.5 or ph_val < 7.5 else "NORMAL"},
                "salinity": {"value": salinity_val, "unit": "ppt", "status": "NORMAL"},
                "ammonia": {"value": ammonia_val, "unit": "mg/L", "status": "CRITICAL" if ammonia_val > 0.12 else ("WARNING" if ammonia_val > 0.06 else "NORMAL")},
                "turbidity": {"value": turbidity_val, "unit": "cm", "status": "NORMAL"},
                "water_level": {"value": water_level_val, "unit": "m", "status": "NORMAL"}
            },
            "active_event": self.injected_events.get(pond_id, {}).get("type", None)
        }

    def generate_all_ponds_snapshot(self) -> List[Dict[str, Any]]:
        return [self.generate_current_pond_readings(p) for p in range(1, 11)]

iot_simulator = IoTSimulator()
