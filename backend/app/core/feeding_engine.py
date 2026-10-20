from typing import Dict, Any, List

class SmartFeedingEngine:
    """
    AquaIntel Smart Feeding Engine
    Inputs:
    - Biomass (kg)
    - Shrimp age (days of culture - DOC)
    - Water Temperature (°C)
    - Dissolved Oxygen - DO (mg/L)
    - Historical feeding response score (1-10)
    - Ammonia level (mg/L)
    - Uneaten feed check (boolean)
    """

    # Base feeding percentage by Days of Culture (DOC) for L. vannamei
    @staticmethod
    def get_base_feeding_rate_pct(doc: int) -> float:
        if doc <= 15:
            return 8.0  # 8% of biomass daily
        elif doc <= 30:
            return 6.5
        elif doc <= 45:
            return 4.8
        elif doc <= 60:
            return 3.8
        elif doc <= 75:
            return 3.0
        elif doc <= 90:
            return 2.5
        else:
            return 2.0

    @classmethod
    def calculate_feeding_recommendation(
        cls,
        biomass_kg: float,
        doc: int,
        temp_c: float,
        do_mg_l: float,
        ammonia_mg_l: float = 0.02,
        uneaten_feed_detected: bool = False,
        feeding_response_score: float = 8.5
    ) -> Dict[str, Any]:
        base_rate_pct = cls.get_base_feeding_rate_pct(doc)
        base_feed_kg = round((biomass_kg * (base_rate_pct / 100.0)), 2)

        reduction_percentage = 0.0
        reasons: List[str] = []
        is_cutoff = False

        # 1. Dissolved Oxygen (DO) Safety Cutoff & Reductions
        if do_mg_l < 3.2:
            is_cutoff = True
            reduction_percentage = 100.0
            reasons.append(f"CRITICAL SAFETY STOP: DO is {do_mg_l:.1f} mg/L (< 3.2 mg/L). Shrimp stop ingesting and feed causes fatal organic load.")
        elif do_mg_l < 4.0:
            reduction_percentage += 60.0
            reasons.append(f"DO below safe limit ({do_mg_l:.1f} mg/L < 4.0 mg/L): Feed reduced by 60% to avoid pond bottom suffocation.")
        elif do_mg_l < 4.8:
            reduction_percentage += 25.0
            reasons.append(f"DO slightly sub-optimal ({do_mg_l:.1f} mg/L < 4.8 mg/L): Feed reduced by 25%.")

        # 2. Water Temperature Adjustments
        if not is_cutoff:
            if temp_c > 33.5:
                reduction_percentage += 35.0
                reasons.append(f"High water temperature ({temp_c:.1f}°C > 33.5°C): Feed reduced by 35% due to metabolic stress.")
            elif temp_c > 32.0:
                reduction_percentage += 15.0
                reasons.append(f"Elevated temperature ({temp_c:.1f}°C): Feed adjusted down by 15%.")
            elif temp_c < 25.0:
                reduction_percentage += 40.0
                reasons.append(f"Low temperature ({temp_c:.1f}°C < 25.0°C): Shrimp metabolic rate severely reduced, cut by 40%.")
            elif temp_c < 27.0:
                reduction_percentage += 15.0
                reasons.append(f"Sub-optimal cool temperature ({temp_c:.1f}°C): Feed reduced by 15%.")

        # 3. Ammonia (Total Ammonia Nitrogen) safety
        if not is_cutoff:
            if ammonia_mg_l > 0.15:
                reduction_percentage += 50.0
                reasons.append(f"Ammonia toxicity risk ({ammonia_mg_l:.3f} mg/L > 0.15 mg/L): Feed reduced by 50% to prevent nitrogen spike.")
            elif ammonia_mg_l > 0.08:
                reduction_percentage += 20.0
                reasons.append(f"Elevated Ammonia ({ammonia_mg_l:.3f} mg/L): Feed reduced by 20%.")

        # 4. Check Tray / Computer Vision Uneaten Feed
        if not is_cutoff and uneaten_feed_detected:
            reduction_percentage += 30.0
            reasons.append("Uneaten feed identified in check tray / CV observation: Feed reduced by 30% to prevent pond bottom sludge.")

        # 5. Acoustic / Tray Feeding Response Adjustment
        if not is_cutoff:
            if feeding_response_score < 5.0:
                reduction_percentage += 20.0
                reasons.append(f"Low feeding activity score ({feeding_response_score}/10): Feed reduced by 20%.")
            elif feeding_response_score >= 9.0 and reduction_percentage == 0:
                # Slight positive boost if optimal
                reasons.append("Exceptional shrimp appetite score (9+/10) in optimal parameters.")

        # Cap reduction at 100%
        final_reduction_pct = min(100.0, reduction_percentage)
        multiplier = max(0.0, (100.0 - final_reduction_pct) / 100.0)
        recommended_feed_kg = round(base_feed_kg * multiplier, 2)

        if not reasons:
            reasons.append("All water quality metrics optimal. Dispensing 100% recommended nutritional allowance.")

        status_flag = "NORMAL" if final_reduction_pct == 0 else ("CRITICAL_STOP" if final_reduction_pct == 100 else "REDUCED")

        return {
            "biomass_kg": biomass_kg,
            "doc": doc,
            "base_rate_pct": base_rate_pct,
            "base_feed_kg": base_feed_kg,
            "recommended_feed_kg": recommended_feed_kg,
            "reduction_percentage": round(final_reduction_pct, 1),
            "reasons": reasons,
            "status": status_flag,
            "fcr_estimate": 1.22 if status_flag == "NORMAL" else 1.28
        }

feeding_engine = SmartFeedingEngine()
