from typing import List, Dict, Any
import numpy as np

class TelemetryFeatureExtractor:
    """
    Extracts biological stress indicators and rate-of-change dynamics
    from multi-probe telemetry time-series for Penaeus vannamei culture.
    """

    @staticmethod
    def extract_features(readings_history: List[Dict[str, Any]]) -> Dict[str, float]:
        """
        Calculates rolling statistics, drop velocity, and diurnal swings.
        """
        if not readings_history or len(readings_history) < 2:
            return {
                "mean_do": 6.0,
                "min_do": 6.0,
                "do_drop_velocity_per_hr": 0.0,
                "mean_temp": 29.0,
                "temp_swing_24h": 2.0,
                "mean_ph": 8.0,
                "ph_fluctuation": 0.3,
                "ammonia_trend_slope": 0.0,
                "cumulative_stress_index": 5.0
            }

        do_vals = [r.get("do", 6.0) for r in readings_history]
        temp_vals = [r.get("temperature", 29.0) for r in readings_history]
        ph_vals = [r.get("ph", 8.0) for r in readings_history]
        ammonia_vals = [r.get("ammonia", 0.02) for r in readings_history]

        mean_do = float(np.mean(do_vals))
        min_do = float(np.min(do_vals))
        mean_temp = float(np.mean(temp_vals))
        temp_swing = float(np.max(temp_vals) - np.min(temp_vals))
        mean_ph = float(np.mean(ph_vals))
        ph_fluct = float(np.max(ph_vals) - np.min(ph_vals))

        # Velocity of DO drop (last 2 readings)
        do_velocity = 0.0
        if len(do_vals) >= 2:
            do_velocity = float(do_vals[-2] - do_vals[-1])  # positive means dropping

        # Ammonia slope
        ammonia_slope = float(ammonia_vals[-1] - ammonia_vals[0]) / max(1, len(ammonia_vals))

        # Cumulative physiological stress index (0 - 100)
        stress_idx = 0.0
        if min_do < 4.0:
            stress_idx += (4.0 - min_do) * 20.0
        if temp_swing > 3.5:
            stress_idx += (temp_swing - 3.5) * 10.0
        if ph_fluct > 0.8:
            stress_idx += (ph_fluct - 0.8) * 15.0
        if ammonia_vals[-1] > 0.06:
            stress_idx += (ammonia_vals[-1] - 0.06) * 250.0

        return {
            "mean_do": round(mean_do, 2),
            "min_do": round(min_do, 2),
            "do_drop_velocity_per_hr": round(do_velocity, 2),
            "mean_temp": round(mean_temp, 1),
            "temp_swing_24h": round(temp_swing, 1),
            "mean_ph": round(mean_ph, 2),
            "ph_fluctuation": round(ph_fluct, 2),
            "ammonia_trend_slope": round(ammonia_slope, 4),
            "cumulative_stress_index": round(min(100.0, max(0.0, stress_idx)), 1)
        }
