from typing import Dict, Any, List

class ExplainableDiseaseRiskModel:
    """
    Model C: Explainable Disease Risk Decision-Support Model (Section 14)
    Covers:
    - WSSV (White Spot Syndrome Virus)
    - Vibriosis (Vibrio parahaemolyticus / harveyi)
    - EMS / AHPND (Acute Hepatopancreatic Necrosis Disease)
    
    IMPORTANT: Sensor telemetry provides environmental vulnerability risk scoring only.
    Definitive diagnosis REQUIRES expert inspection and laboratory PCR confirmation.
    """

    MODEL_METADATA = {
        "model_id": "AQUAINTEL-DIS-V2.1-EXPLAINABLE",
        "model_type": "Multi-Stressor Vulnerability Decision Matrix",
        "target_species": "Litopenaeus vannamei",
        "provenance": "Empirical Aquaculture Epidemiology & Physiological Stress Literature",
        "clinical_disclaimer": "DISCLAIMER: This system provides early warning environmental vulnerability risk estimation. It is NOT a clinical diagnosis. Laboratory PCR testing and veterinary pathology inspection are mandatory before administering therapeutic treatments."
    }

    @classmethod
    def evaluate_risk(
        cls,
        disease_key: str,
        do_mg_l: float,
        temp_c: float,
        ammonia_mg_l: float,
        feeding_drop_pct: float = 0.0,
        temp_fluctuation_24h: float = 2.0
    ) -> Dict[str, Any]:
        """
        Calculates additive stressor scores with clear feature importance factors.
        """
        stressors = []
        score = 0.0

        if disease_key.upper() == "WSSV":
            # WSSV triggers strongly on low DO and temperature drops < 28°C or sudden temperature drops
            if temp_c < 27.0:
                pts = min(40.0, (27.0 - temp_c) * 15.0)
                score += pts
                stressors.append(f"Sub-optimal water temperature ({temp_c:.1f}°C < 27°C) suppresses prawn immune response (+{pts:.0f} pts)")
            if temp_fluctuation_24h > 3.0:
                pts = min(25.0, (temp_fluctuation_24h - 3.0) * 12.0)
                score += pts
                stressors.append(f"High diurnal thermal fluctuation ({temp_fluctuation_24h:.1f}°C swing) induces molting stress (+{pts:.0f} pts)")
            if do_mg_l < 4.0:
                pts = min(30.0, (4.0 - do_mg_l) * 20.0)
                score += pts
                stressors.append(f"Hypoxic stress ({do_mg_l:.1f} mg/L DO) suppresses hemocyte bactericidal activity (+{pts:.0f} pts)")
            if feeding_drop_pct > 30.0:
                pts = min(20.0, (feeding_drop_pct - 30.0) * 0.5)
                score += pts
                stressors.append(f"Marked feed intake decline ({feeding_drop_pct:.0f}%) indicates early behavioral lethargy (+{pts:.0f} pts)")

        elif disease_key.upper() == "VIBRIOSIS":
            # Vibriosis proliferates in warm (> 31°C), high ammonia, and stagnant organic conditions
            if temp_c > 31.5:
                pts = min(35.0, (temp_c - 31.5) * 15.0)
                score += pts
                stressors.append(f"Elevated temperature ({temp_c:.1f}°C) accelerates Vibrio CFU bacterial multiplication (+{pts:.0f} pts)")
            if ammonia_mg_l > 0.06:
                pts = min(40.0, (ammonia_mg_l - 0.06) * 350.0)
                score += pts
                stressors.append(f"Excess toxic unionized ammonia ({ammonia_mg_l:.3f} mg/L) erodes gill cuticle and chitin (+{pts:.0f} pts)")
            if do_mg_l < 4.2:
                pts = min(25.0, (4.2 - do_mg_l) * 15.0)
                score += pts
                stressors.append(f"Sub-optimal dissolved oxygen ({do_mg_l:.1f} mg/L) impairs macrophage phagocytosis (+{pts:.0f} pts)")

        elif disease_key.upper() in ["EMS", "AHPND"]:
            # Early Mortality Syndrome / AHPND (PirA/PirB toxin from Vibrio parahaemolyticus)
            if ammonia_mg_l > 0.05:
                pts = min(40.0, (ammonia_mg_l - 0.05) * 400.0)
                score += pts
                stressors.append(f"High organic nitrogen/ammonia ({ammonia_mg_l:.3f} mg/L) provides substrate for virulent Vibrio clades (+{pts:.0f} pts)")
            if temp_c > 32.0:
                pts = min(30.0, (temp_c - 32.0) * 12.0)
                score += pts
                stressors.append(f"High water temperature ({temp_c:.1f}°C) triggers quorum sensing gene expression (+{pts:.0f} pts)")
            if feeding_drop_pct > 25.0:
                pts = min(30.0, (feeding_drop_pct - 25.0) * 0.6)
                score += pts
                stressors.append(f"Hepatopancreas atrophy symptom: severe anorexia and empty gut check trays (+{pts:.0f} pts)")

        bounded_score = min(100.0, max(5.0, score))
        if bounded_score >= 70.0:
            category = "CRITICAL"
        elif bounded_score >= 45.0:
            category = "HIGH"
        elif bounded_score >= 25.0:
            category = "MEDIUM"
        else:
            category = "LOW"

        recommendations = []
        if bounded_score >= 45.0:
            recommendations.append("Dispatch pond scouts for immediate check-tray and cast-net physical inspection")
            recommendations.append("Collect 10 specimen pleopod tissue samples for RT-qPCR laboratory screening")
            if do_mg_l < 5.0:
                recommendations.append("Engage supplementary paddlewheel aeration to sustain DO above 5.5 mg/L")
            if ammonia_mg_l > 0.05:
                recommendations.append("Cut daily feed ration by 40-50% to prevent further bacterial substrate enrichment")
        else:
            recommendations.append("Maintain routine water quality monitoring and standard diurnal feeding schedule")

        return {
            "disease_key": disease_key.upper(),
            "risk_score": round(bounded_score, 1),
            "risk_category": category,
            "contributing_stressors": stressors or ["All water quality parameters within safe physiological bounds."],
            "recommendations": recommendations,
            "metadata": cls.MODEL_METADATA
        }
