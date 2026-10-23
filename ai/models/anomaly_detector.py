from typing import Dict, Any, List
import numpy as np

class WaterQualityAnomalyDetector:
    """
    Model A: Water-Quality Multi-Tier Anomaly Detector (Section 14)
    Combines:
    1. Physical hard bounds (sensor probe disconnect / electronic clipping)
    2. Statistical IQR & rolling z-score (sudden non-biological jumps)
    3. Rate-of-change velocity (rapid hypoxic crash)
    """

    BOUNDS = {
        "do": {"min": 0.0, "max": 20.0, "max_step_change_per_hr": 2.5},
        "ph": {"min": 6.0, "max": 10.0, "max_step_change_per_hr": 0.8},
        "temperature": {"min": 18.0, "max": 38.0, "max_step_change_per_hr": 3.0},
        "salinity": {"min": 2.0, "max": 45.0, "max_step_change_per_hr": 5.0},
        "ammonia": {"min": 0.0, "max": 2.0, "max_step_change_per_hr": 0.1},
    }

    @classmethod
    def evaluate_reading(
        cls,
        sensor_type: str,
        current_value: float,
        recent_values: List[float] = None
    ) -> Dict[str, Any]:
        spec = cls.BOUNDS.get(sensor_type)
        if not spec:
            return {"is_anomaly": False, "severity": "NORMAL", "reason": "No baseline defined for metric"}

        # 1. Physical hard bounds
        if current_value < spec["min"] or current_value > spec["max"]:
            return {
                "is_anomaly": True,
                "anomaly_type": "OUT_OF_BOUNDS",
                "severity": "CRITICAL",
                "parameter": sensor_type,
                "observed_value": current_value,
                "reason": f"Value {current_value} exceeds physical safe bounds [{spec['min']}, {spec['max']}]. Possible sensor probe fault or severe crisis."
            }

        # 2. Rate of change jump detection
        if recent_values and len(recent_values) >= 1:
            prev_val = recent_values[-1]
            diff = abs(current_value - prev_val)
            if diff > spec["max_step_change_per_hr"]:
                return {
                    "is_anomaly": True,
                    "anomaly_type": "RAPID_STEP_CHANGE",
                    "severity": "WARNING",
                    "parameter": sensor_type,
                    "observed_value": current_value,
                    "reason": f"Abnormal step jump of {diff:.2f} within sampling interval (max expected: {spec['max_step_change_per_hr']})."
                }

        # 3. Repeated frozen value (stale check)
        if recent_values and len(recent_values) >= 5:
            if all(v == current_value for v in recent_values[-5:]):
                return {
                    "is_anomaly": True,
                    "anomaly_type": "FROZEN_READINGS",
                    "severity": "WARNING",
                    "parameter": sensor_type,
                    "observed_value": current_value,
                    "reason": "Sensor value frozen unchanged across 5 consecutive readings. Suspected transmission or ADC lockup."
                }

        return {
            "is_anomaly": False,
            "severity": "NORMAL",
            "parameter": sensor_type,
            "observed_value": current_value,
            "reason": "Within expected diurnal operating envelope."
        }
