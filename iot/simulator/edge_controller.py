from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

class EdgeControllerStateMachine:
    """
    Firmware-Equivalent State Machine for ESP32 Pond Master Edge Controller (Section 13)
    Operates locally at the pond bank with ZERO dependency on cloud or internet.
    States:
    - NORMAL: DO >= 5.0 mg/L, routine sensor polling, standard diurnal feeding schedule
    - WARNING: 3.5 <= DO < 5.0 mg/L or elevated ammonia; supplementary paddlewheel active
    - CRITICAL: DO < 3.0 mg/L; HARDWARE EMERGENCY: all aerators engaged, feeder cut off
    - SENSOR_FAULT: Optical probe disconnect or invalid reading; hold safe aeration baseline
    - ACTUATOR_FAULT: Motor overload trip or contactor auxiliary feedback missing
    - COMMUNICATION_LOSS: LoRa gateway link offline; buffer telemetry locally to SPIFFS/SD
    - MANUAL_OVERRIDE: Physical field switch toggled by pond scout; cloud controls locked out
    - RECOVERY: Post-hypoxia DO trending upwards; gradual de-escalation of boost aerators
    """

    STATES = [
        "NORMAL",
        "WARNING",
        "CRITICAL",
        "SENSOR_FAULT",
        "ACTUATOR_FAULT",
        "COMMUNICATION_LOSS",
        "MANUAL_OVERRIDE",
        "RECOVERY"
    ]

    def __init__(self, pond_id: int, device_id: str):
        self.pond_id = pond_id
        self.device_id = device_id
        self.current_state = "NORMAL"
        self.local_buffer = []
        self.relay_aerator_state = "OFF"
        self.relay_feeder_state = "ENABLED"
        self.last_state_change = datetime.now(timezone.utc)
        self.manual_override_engaged = False

    def update_cycle(
        self,
        do_reading: Optional[float],
        temp_reading: Optional[float],
        internet_available: bool = True,
        manual_switch: bool = False
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        prev_state = self.current_state

        # 1. Manual hardware override takes absolute precedence
        if manual_switch:
            self.current_state = "MANUAL_OVERRIDE"
            self.relay_aerator_state = "ON"
            return self._build_status(prev_state, "Physical field toggle switch engaged by operator.")

        # 2. Check probe validity
        if do_reading is None or do_reading < 0.1 or do_reading > 25.0:
            self.current_state = "SENSOR_FAULT"
            # Fail-safe posture: engage aerators to prevent silent overnight suffocation
            self.relay_aerator_state = "ON"
            self.relay_feeder_state = "DISABLED"
            return self._build_status(prev_state, "Sensor reading invalid or disconnected. Fail-safe aeration active.")

        # 3. Critical hypoxia safety interlock
        if do_reading < 3.0:
            self.current_state = "CRITICAL"
            self.relay_aerator_state = "ON"
            self.relay_feeder_state = "DISABLED"  # Stop feeding immediately
            return self._build_status(prev_state, f"EMERGENCY HYPOXIA: DO={do_reading:.2f} mg/L (< 3.0). All aerators ON, feeding HALTED.")

        # 4. Warning condition
        if do_reading < 5.0:
            self.current_state = "WARNING"
            self.relay_aerator_state = "ON"
            return self._build_status(prev_state, f"Low DO warning ({do_reading:.2f} mg/L). Aeration maintained.")

        # 5. Communication loss check
        if not internet_available:
            self.current_state = "COMMUNICATION_LOSS"
            # Buffer reading locally
            self.local_buffer.append({
                "timestamp": now.isoformat(),
                "do": do_reading,
                "temp": temp_reading
            })
            return self._build_status(prev_state, f"Cloud link severed. Local safety running, {len(self.local_buffer)} records queued.")

        # 6. Recovery check
        if prev_state in ["CRITICAL", "WARNING"] and do_reading >= 5.5:
            self.current_state = "RECOVERY"
            return self._build_status(prev_state, f"DO recovered to {do_reading:.2f} mg/L. Stabilizing parameters.")

        # Normal operation
        self.current_state = "NORMAL"
        self.relay_feeder_state = "ENABLED"
        return self._build_status(prev_state, "Normal biological balance.")

    def _build_status(self, prev_state: str, reason: str) -> Dict[str, Any]:
        return {
            "device_id": self.device_id,
            "pond_id": self.pond_id,
            "current_state": self.current_state,
            "previous_state": prev_state,
            "actuators": {
                "aerator_relays": self.relay_aerator_state,
                "feeder_lockout": "LOCKED" if self.relay_feeder_state == "DISABLED" else "UNLOCKED"
            },
            "buffered_records_count": len(self.local_buffer),
            "reason": reason
        }
