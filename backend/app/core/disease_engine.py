from typing import Dict, Any, List

class DiseaseRiskEngine:
    """
    AquaIntel Explainable AI-Based Disease Risk Prediction Engine
    
    IMPORTANT NOTICE:
    This engine computes mathematical risk probabilities based on environmental,
    water-quality, acoustic, and behavioral indicators. It provides PRELIMINARY
    RISK PREDICTION ONLY. Clinical laboratory confirmation (PCR/Microbiology) is required
    for definitive medical diagnosis.
    """

    DISEASE_PROFILES = {
        "WSSV": {
            "name": "White Spot Syndrome Virus (WSSV)",
            "pathogen": "Nimaviridae (dsDNA virus)",
            "critical_triggers": ["Sudden temperature drop (<26°C or Δ>3°C/24h)", "DO crash (<3.5 mg/L)", "Low salinity (<12 ppt)"]
        },
        "Vibriosis": {
            "name": "Luminescent Vibriosis",
            "pathogen": "Vibrio harveyi / Vibrio parahaemolyticus",
            "critical_triggers": ["High water temperature (>31°C)", "High Ammonia (>0.08 mg/L)", "Overfeeding / pond bottom sludge"]
        },
        "EMS_AHPND": {
            "name": "Early Mortality Syndrome / AHPND",
            "pathogen": "Vibrio parahaemolyticus expressing PirA/PirB toxins",
            "critical_triggers": ["High pH fluctuations (>8.6 or Δ>0.6)", "Early DOC (DOC 10-40)", "High salinity (>28 ppt)", "Low DO"]
        }
    }

    @classmethod
    def evaluate_risk(
        cls,
        disease_key: str,
        do_mg_l: float,
        temp_c: float,
        ph: float,
        ammonia_mg_l: float,
        salinity_ppt: float,
        doc: int,
        temp_delta_24h: float = 0.5,
        feeding_reduction_pct: float = 0.0,
        historical_disease_incident: bool = False
    ) -> Dict[str, Any]:
        """
        Calculate additive explainable risk score (0-100)
        """
        score = 0
        breakdown = {}
        explanations: List[str] = []
        recommendations: List[str] = []

        if disease_key == "WSSV":
            # 1. Temperature instability (+25 max)
            if temp_c < 26.0 or temp_delta_24h >= 2.5:
                pts = 25
                breakdown["temp_instability"] = pts
                score += pts
                explanations.append(f"Temperature cold stress / rapid drop ({temp_c:.1f}°C, Δ{temp_delta_24h:.1f}°C): WSSV replicates virulently under thermal drop.")
                recommendations.append("Limit cold water exchange; increase depth to maintain thermal buffer.")
            elif temp_delta_24h >= 1.5:
                pts = 12
                breakdown["temp_instability"] = pts
                score += pts
                explanations.append(f"Moderate temperature fluctuation (Δ{temp_delta_24h:.1f}°C in 24h).")

            # 2. Low DO stress (+25 max)
            if do_mg_l < 3.5:
                pts = 25
                breakdown["low_do"] = pts
                score += pts
                explanations.append(f"Hypoxic stress (DO {do_mg_l:.1f} mg/L): Severely compromises shrimp immune phagocytosis.")
                recommendations.append("Trigger emergency continuous aeration immediately.")
            elif do_mg_l < 4.5:
                pts = 15
                breakdown["low_do"] = pts
                score += pts
                explanations.append(f"Sub-optimal DO ({do_mg_l:.1f} mg/L) inducing mild immunosuppression.")
                recommendations.append("Engage secondary aerators.")

            # 3. High Ammonia/Metabolic stress (+20 max)
            if ammonia_mg_l > 0.10:
                pts = 20
                breakdown["ammonia_toxicity"] = pts
                score += pts
                explanations.append(f"High unionized ammonia ({ammonia_mg_l:.3f} mg/L) causing gill irritation.")
                recommendations.append("Apply nitrifying bio-probiotics and stop overfeeding.")
            elif ammonia_mg_l > 0.05:
                pts = 10
                breakdown["ammonia_toxicity"] = pts
                score += pts
                explanations.append(f"Elevated ammonia level ({ammonia_mg_l:.3f} mg/L).")

            # 4. Abnormal feeding / lethargy (+15 max)
            if feeding_reduction_pct >= 40.0:
                pts = 15
                breakdown["appetite_loss"] = pts
                score += pts
                explanations.append(f"Severe appetite cessation ({feeding_reduction_pct:.0f}% feed drop observed): Primary clinical indicator of systemic infection.")
                recommendations.append("Collect shrimp samples from check trays for inspection of white spots on carapace.")
            elif feeding_reduction_pct >= 20.0:
                pts = 8
                breakdown["appetite_loss"] = pts
                score += pts
                explanations.append("Moderate appetite decrease.")

            # 5. History / Pond Biosecurity (+15 max)
            if historical_disease_incident:
                pts = 15
                breakdown["historical_outbreak"] = pts
                score += pts
                explanations.append("Previous viral outbreak recorded in adjacent quadrant within past crop cycle.")

        elif disease_key == "Vibriosis":
            # High temp + high organic load + high ammonia
            if temp_c > 31.5:
                pts = 30
                breakdown["high_temperature"] = pts
                score += pts
                explanations.append(f"Warm water ({temp_c:.1f}°C) triggers exponential Vibrio bacterial replication.")
                recommendations.append("Increase aeration to enhance bottom circulation and surface cooling.")

            if ammonia_mg_l > 0.10:
                pts = 25
                breakdown["organic_nitrogen"] = pts
                score += pts
                explanations.append(f"High ammonia ({ammonia_mg_l:.3f} mg/L) indicates excessive unassimilated organics favoring Vibrio bloom.")
                recommendations.append("Apply Bacillus-based soil & water probiotics; perform water exchange if biosecurity allows.")

            if do_mg_l < 4.0:
                pts = 20
                breakdown["low_do"] = pts
                score += pts
                explanations.append(f"Low DO ({do_mg_l:.1f} mg/L) weakens shrimp gut epithelial integrity.")

            if salinity_ppt > 28.0:
                pts = 15
                breakdown["high_salinity"] = pts
                score += pts
                explanations.append(f"High salinity ({salinity_ppt:.1f} ppt) enhances Vibrio virulence.")

            if feeding_reduction_pct >= 25.0:
                pts = 10
                breakdown["feeding_drop"] = pts
                score += pts
                explanations.append("Feeding drop detected.")

        else:  # EMS_AHPND
            # Vulnerability highest at DOC 15-45, high pH or high pH swings, high salinity
            if 15 <= doc <= 45:
                pts = 30
                breakdown["critical_doc_window"] = pts
                score += pts
                explanations.append(f"Vulnerable growth stage (DOC {doc}): Peak susceptibility period for toxin-producing AHPND.")
                recommendations.append("Intensify check-tray hepatopancreas monitoring.")

            if ph > 8.5 or ph < 7.4:
                pts = 25
                breakdown["ph_stress"] = pts
                score += pts
                explanations.append(f"Unfavorable pH ({ph:.2f}): Disruption in gut pH homeostasis enhances toxin absorption.")
                recommendations.append("Buffer pond with agricultural limestone or dolomite.")

            if do_mg_l < 4.0:
                pts = 20
                breakdown["low_do"] = pts
                score += pts
                explanations.append(f"Low DO ({do_mg_l:.1f} mg/L) compromises immune lysozyme activity.")

            if ammonia_mg_l > 0.08:
                pts = 15
                breakdown["toxic_ammonia"] = pts
                score += pts
                explanations.append("Elevated ammonia causing hepatopancreatic tubule necrosis.")

            if feeding_reduction_pct >= 30.0:
                pts = 10
                breakdown["empty_gut_feeding_drop"] = pts
                score += pts
                explanations.append("Sharp feeding drop consistent with pale/atrophied hepatopancreas syndrome.")

        # Ensure base baseline
        if score == 0:
            score = 12
            breakdown["baseline_ambient"] = 12
            explanations.append("Optimal environmental parameters. Normal background microbial flora.")
            recommendations.append("Maintain existing probiotic regimen and automated aeration schedule.")

        score = min(100, score)

        # Classification
        if score <= 25:
            level = "LOW"
        elif score <= 50:
            level = "MEDIUM"
        elif score <= 75:
            level = "HIGH"
        else:
            level = "CRITICAL"

        profile = cls.DISEASE_PROFILES.get(disease_key, {"name": disease_key, "pathogen": "Microbial agent"})

        return {
            "disease_key": disease_key,
            "disease_name": profile["name"],
            "pathogen": profile["pathogen"],
            "risk_score": score,
            "risk_level": level,
            "contributors": breakdown,
            "explanations": explanations,
            "recommendations": recommendations,
            "disclaimer": "AI-based disease RISK prediction only. Laboratory confirmation (PCR/culture) is required for clinical diagnosis."
        }

disease_risk_engine = DiseaseRiskEngine()
