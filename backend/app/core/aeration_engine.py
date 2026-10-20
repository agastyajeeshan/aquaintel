from datetime import datetime, timedelta
from typing import Dict, Any, List

class AerationController:
    """
    AquaIntel Smart Aeration Algorithm with Hysteresis & Energy Management
    Features:
    - Multi-stage activation based on Dissolved Oxygen (DO)
    - Hysteresis to prevent frequent on/off cycling
    - Minimum ON time & Minimum OFF time protection for motors/VFDs
    - Manual and Emergency override handling
    - Electrical consumption & cost calculation (INR)
    """

    MIN_ON_SECONDS = 600   # 10 minutes
    MIN_OFF_SECONDS = 600  # 10 minutes
    DO_EMERGENCY_THRESHOLD = 3.8   # mg/L
    DO_BOOST_THRESHOLD = 4.8       # mg/L
    DO_NORMAL_TARGET = 5.8         # mg/L
    DO_STANDBY_CUTOFF = 6.8        # mg/L
    HYSTERESIS_BAND = 0.4          # mg/L
    KWH_COST_INR = 7.50            # Commercial/Agri tariff

    @classmethod
    def evaluate_aerator_state(
        cls,
        current_do: float,
        current_status: str,  # "RUNNING", "STANDBY", "EMERGENCY"
        last_state_change: datetime,
        mode: str = "SMART_HYSTERESIS",  # "SMART_HYSTERESIS", "MANUAL", "EMERGENCY"
        manual_target: str = None
    ) -> Dict[str, Any]:
        now = datetime.utcnow()
        seconds_in_current_state = (now - last_state_change).total_seconds() if last_state_change else 999999

        # Handle explicit MANUAL mode
        if mode == "MANUAL":
            new_status = manual_target if manual_target in ["RUNNING", "STANDBY"] else current_status
            return {
                "new_status": new_status,
                "action": "MANUAL_OVERRIDE" if new_status != current_status else "NO_CHANGE",
                "reason": f"Manual operator override set to {new_status}.",
                "seconds_elapsed": seconds_in_current_state,
                "can_switch": True
            }

        # Handle explicit EMERGENCY mode
        if mode == "EMERGENCY" or current_do < cls.DO_EMERGENCY_THRESHOLD:
            return {
                "new_status": "RUNNING",
                "action": "EMERGENCY_START" if current_status != "RUNNING" else "MAINTAIN_EMERGENCY",
                "reason": f"CRITICAL: DO level at {current_do:.2f} mg/L is below emergency threshold {cls.DO_EMERGENCY_THRESHOLD} mg/L. Full aeration engaged.",
                "seconds_elapsed": seconds_in_current_state,
                "can_switch": True
            }

        # SMART HYSTERESIS LOGIC
        if current_status == "RUNNING":
            # Check if condition is met to turn OFF
            # Must satisfy: current_do >= (DO_STANDBY_CUTOFF + HYSTERESIS_BAND) AND min ON duration met
            if current_do >= (cls.DO_STANDBY_CUTOFF + cls.HYSTERESIS_BAND):
                if seconds_in_current_state >= cls.MIN_ON_SECONDS:
                    return {
                        "new_status": "STANDBY",
                        "action": "STOP",
                        "reason": f"DO saturated at {current_do:.2f} mg/L (above cutoff {cls.DO_STANDBY_CUTOFF} mg/L). Minimum run duration met ({int(seconds_in_current_state/60)} min). Aerator placed on standby to conserve energy.",
                        "seconds_elapsed": seconds_in_current_state,
                        "can_switch": True
                    }
                else:
                    remaining_sec = cls.MIN_ON_SECONDS - seconds_in_current_state
                    return {
                        "new_status": "RUNNING",
                        "action": "HYSTERESIS_HOLD_ON",
                        "reason": f"DO satisfied ({current_do:.2f} mg/L), but aerator holding ON to satisfy anti-cycling protection ({int(remaining_sec)}s remaining).",
                        "seconds_elapsed": seconds_in_current_state,
                        "can_switch": False
                    }
            else:
                return {
                    "new_status": "RUNNING",
                    "action": "MAINTAIN_RUNNING",
                    "reason": f"Aerator maintaining active circulation. DO: {current_do:.2f} mg/L.",
                    "seconds_elapsed": seconds_in_current_state,
                    "can_switch": True
                }

        else:  # current_status == "STANDBY" or "STOPPED"
            # Check if condition is met to turn ON
            # Trigger if DO drops below DO_BOOST_THRESHOLD or DO_NORMAL_TARGET
            if current_do < cls.DO_NORMAL_TARGET:
                if seconds_in_current_state >= cls.MIN_OFF_SECONDS:
                    return {
                        "new_status": "RUNNING",
                        "action": "START",
                        "reason": f"DO dropped to {current_do:.2f} mg/L (threshold: {cls.DO_NORMAL_TARGET} mg/L). Smart automated start triggered.",
                        "seconds_elapsed": seconds_in_current_state,
                        "can_switch": True
                    }
                else:
                    remaining_sec = cls.MIN_OFF_SECONDS - seconds_in_current_state
                    return {
                        "new_status": "STANDBY",
                        "action": "HYSTERESIS_HOLD_OFF",
                        "reason": f"DO low ({current_do:.2f} mg/L), waiting for motor cool-down safety interval ({int(remaining_sec)}s remaining).",
                        "seconds_elapsed": seconds_in_current_state,
                        "can_switch": False
                    }
            else:
                return {
                    "new_status": "STANDBY",
                    "action": "MAINTAIN_STANDBY",
                    "reason": f"Dissolved oxygen healthy at {current_do:.2f} mg/L. Aerator in standby state.",
                    "seconds_elapsed": seconds_in_current_state,
                    "can_switch": True
                }

    @classmethod
    def calculate_energy(cls, power_rating_kw: float, runtime_hours: float) -> Dict[str, float]:
        kwh = round(power_rating_kw * runtime_hours, 2)
        cost_inr = round(kwh * cls.KWH_COST_INR, 2)
        return {
            "power_rating_kw": power_rating_kw,
            "runtime_hours": runtime_hours,
            "kwh_consumed": kwh,
            "cost_inr": cost_inr
        }

aeration_controller = AerationController()
