import sys
import json
from pathlib import Path
from typing import Dict, Any, Optional, List

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import pandas as pd
import numpy as np
import joblib

from ai.models.disease_model import ExplainableDiseaseRiskModel

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ARTIFACTS_DIR = REPO_ROOT / "ai" / "artifacts"
MODEL_FILE = ARTIFACTS_DIR / "disease_risk_pipeline.joblib"
METADATA_FILE = ARTIFACTS_DIR / "metadata.json"


class DiseaseRiskInferenceEngine:
    """
    Inference Engine for AquaIntel Disease Risk Assessment
    - Loads trained Random Forest pipeline from ai/artifacts/
    - Predicts pathogen risk distributions across 7 classes
    - Provides graceful fallback to rule-based ExplainableDiseaseRiskModel if model is absent
    - Enforces experimental/synthetic provenance tags and PCR disclaimers
    """

    _model = None
    _metadata = None

    @classmethod
    def _load_model(cls):
        if cls._model is None and MODEL_FILE.exists():
            try:
                cls._model = joblib.load(MODEL_FILE)
            except Exception as e:
                cls._model = None
        if cls._metadata is None and METADATA_FILE.exists():
            try:
                with open(METADATA_FILE, "r") as f:
                    cls._metadata = json.load(f)
            except Exception:
                cls._metadata = None

    @classmethod
    def predict_risk(
        cls,
        culture_day: int = 45,
        temperature_c: float = 28.5,
        do_mg_l: float = 5.5,
        ph: float = 7.9,
        salinity_ppt: float = 20.0,
        tan_mg_l: float = 0.05,
        unionized_nh3_mg_l: float = 0.015,
        turbidity_ntu: float = 25.0,
        water_level_m: float = 1.2,
        estimated_biomass_kg: float = 850.0,
        feed_kg_last_24h: float = 22.0,
        mortality_count_24h: float = 2.0,
        abnormal_behavior_observed: int = 0,
        feeding_response: str = "NORMAL"
    ) -> Dict[str, Any]:
        cls._load_model()

        # Format input vector
        resp = feeding_response.upper()
        feature_dict = {
            "culture_day": [culture_day],
            "temperature_c": [temperature_c],
            "do_mg_l": [do_mg_l],
            "ph": [ph],
            "salinity_ppt": [salinity_ppt],
            "tan_mg_l": [tan_mg_l],
            "unionized_nh3_mg_l": [unionized_nh3_mg_l],
            "turbidity_ntu": [turbidity_ntu],
            "water_level_m": [water_level_m],
            "estimated_biomass_kg": [estimated_biomass_kg],
            "feed_kg_last_24h": [feed_kg_last_24h],
            "mortality_count_24h": [mortality_count_24h],
            "abnormal_behavior_observed": [abnormal_behavior_observed],
            "feed_resp_NORMAL": [1 if resp == "NORMAL" else 0],
            "feed_resp_REDUCED": [1 if resp == "REDUCED" else 0],
            "feed_resp_ABNORMAL": [1 if resp == "ABNORMAL" else 0],
            "feed_resp_UNKNOWN": [1 if resp not in ["NORMAL", "REDUCED", "ABNORMAL"] else 0]
        }
        input_df = pd.DataFrame(feature_dict)

        # 1. ML Pipeline Prediction if model is loaded
        if cls._model is not None:
            try:
                classes = list(cls._model.classes_)
                probs = cls._model.predict_proba(input_df)[0]
                prob_dict = {cls_name: round(float(prob), 4) for cls_name, prob in zip(classes, probs)}
                top_class = str(cls._model.predict(input_df)[0])
                top_prob = prob_dict.get(top_class, 0.0)

                # Determine overall risk category from non-healthy pathogen probability
                pathogen_risk_prob = sum(p for c, p in prob_dict.items() if c != "HEALTHY")
                if pathogen_risk_prob >= 0.65 or top_class in ["WSSV", "AHPND_EMS"]:
                    risk_category = "HIGH" if pathogen_risk_prob < 0.85 else "CRITICAL"
                elif pathogen_risk_prob >= 0.35:
                    risk_category = "MEDIUM"
                else:
                    risk_category = "LOW"

                # Identify contributing environmental stressors
                contributing_factors = []
                if do_mg_l < 4.0:
                    contributing_factors.append(f"Low dissolved oxygen ({do_mg_l:.1f} mg/L) causes hypoxic cellular stress")
                if temperature_c < 26.5:
                    contributing_factors.append(f"Low temperature ({temperature_c:.1f}°C) triggers WSSV susceptibility")
                elif temperature_c > 31.5:
                    contributing_factors.append(f"Elevated temperature ({temperature_c:.1f}°C) accelerates Vibrio CFU proliferation")
                if unionized_nh3_mg_l > 0.03:
                    contributing_factors.append(f"Elevated toxic unionized ammonia ({unionized_nh3_mg_l:.3f} mg/L)")
                if mortality_count_24h > 15:
                    contributing_factors.append(f"Elevated mortality count ({int(mortality_count_24h)} dead shrimp in last 24h)")
                if resp in ["REDUCED", "ABNORMAL"]:
                    contributing_factors.append(f"Observed appetite decline: feeding response is {resp}")

                return {
                    "evaluation_type": "MACHINE_LEARNING_PIPELINE",
                    "model_id": cls._metadata.get("model_id", "AQUAINTEL-RF-DISEASE-V1.0-SYNTHETIC") if cls._metadata else "AQUAINTEL-RF-DISEASE-V1.0-SYNTHETIC",
                    "model_version": cls._metadata.get("version", "1.0.0-synthetic") if cls._metadata else "1.0.0-synthetic",
                    "validation_status": "NOT_VALIDATED_FOR_REAL_WORLD_DISEASE_PREDICTION",
                    "is_synthetic_model": True,
                    "top_predicted_condition": top_class,
                    "risk_category": risk_category,
                    "confidence_score": round(top_prob * 100, 1),
                    "pathogen_probability_distribution": prob_dict,
                    "contributing_stressors": contributing_factors or ["All environmental parameters within safe physiological bounds."],
                    "recommended_actions": [
                        "Dispatch field scout for check-tray visual examination",
                        "Collect 10 pleopod / hepatopancreas specimens for RT-qPCR laboratory testing",
                        "Sustain DO above 5.5 mg/L using supplementary aeration",
                        "Do not administer chemical treatments without veterinary laboratory diagnosis"
                    ],
                    "provenance": "Trained on Synthetic Demo Dataset (1,200 rows)",
                    "clinical_disclaimer": "CRITICAL NOTICE: Laboratory RT-qPCR molecular testing and veterinarian pathology examination are required before taking farm intervention decisions."
                }
            except Exception as e:
                # Log and fallback to rule-based engine
                pass

        # 2. Rule-Based Fallback Engine
        rule_eval = ExplainableDiseaseRiskModel.evaluate_risk(
            disease_key="WSSV",
            do_mg_l=do_mg_l,
            temp_c=temperature_c,
            ammonia_mg_l=unionized_nh3_mg_l,
            feeding_drop_pct=30.0 if resp == "REDUCED" else (50.0 if resp == "ABNORMAL" else 0.0)
        )
        return {
            "evaluation_type": "RULE_BASED_DECISION_MATRIX",
            "model_id": "AQUAINTEL-DIS-V2.1-EXPLAINABLE",
            "validation_status": "RULE_BASED_PHYSIOLOGICAL_BASELINE",
            "is_synthetic_model": False,
            "top_predicted_condition": rule_eval["disease_key"],
            "risk_category": rule_eval["risk_category"],
            "confidence_score": rule_eval["risk_score"],
            "contributing_stressors": rule_eval["contributing_stressors"],
            "recommended_actions": rule_eval["recommendations"],
            "clinical_disclaimer": rule_eval["metadata"]["clinical_disclaimer"]
        }


if __name__ == "__main__":
    res = DiseaseRiskInferenceEngine.predict_risk(
        temperature_c=25.2,
        do_mg_l=3.2,
        unionized_nh3_mg_l=0.04,
        mortality_count_24h=25,
        feeding_response="REDUCED"
    )
    print("Inference Result:", res["top_predicted_condition"], "Risk:", res["risk_category"], "Prob:", res.get("confidence_score"))
