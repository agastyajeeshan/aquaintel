from typing import Dict, Any, List, Optional
from ..models.anomaly_detector import WaterQualityAnomalyDetector
from ..models.disease_model import ExplainableDiseaseRiskModel
from ..features.feature_extractor import TelemetryFeatureExtractor

class AquaIntelInferencePipeline:
    """
    Unified AI inference pipeline coordinating:
    1. Multi-tier sensor anomaly detection
    2. Telemetry feature extraction
    3. Multi-pathogen disease risk estimation
    4. Safe fallback for missing / stale sensor data
    """

    @classmethod
    def evaluate_pond_health(
        cls,
        pond_id: int,
        current_telemetry: Dict[str, Any],
        historical_telemetry: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        if not current_telemetry:
            return {
                "status": "DATA_UNAVAILABLE",
                "message": f"No telemetry available for Pond {pond_id}. Cannot run AI inference.",
                "disease_risks": {},
                "anomalies": []
            }

        # Check for stale data
        if current_telemetry.get("is_stale", False):
            return {
                "status": "STALE_DATA_WARNING",
                "message": "Telemetry is stale (> 30 min). Holding safe baseline; AI risk updates paused.",
                "disease_risks": {
                    "WSSV": {"risk_category": "UNKNOWN (STALE DATA)", "risk_score": 0.0},
                    "VIBRIOSIS": {"risk_category": "UNKNOWN (STALE DATA)", "risk_score": 0.0},
                    "EMS/AHPND": {"risk_category": "UNKNOWN (STALE DATA)", "risk_score": 0.0}
                },
                "anomalies": [{
                    "parameter": "telemetry",
                    "reason": "Stale sensor data detected"
                }]
            }

        metrics = current_telemetry.get("metrics", {})
        do_val = metrics.get("do", {}).get("value", 6.0)
        temp_val = metrics.get("temperature", {}).get("value", 29.0)
        ph_val = metrics.get("ph", {}).get("value", 8.0)
        ammonia_val = metrics.get("ammonia", {}).get("value", 0.02)

        # 1. Anomaly checks
        anomalies = []
        for stype, val in [("do", do_val), ("temp", temp_val), ("ph", ph_val), ("ammonia", ammonia_val)]:
            res = WaterQualityAnomalyDetector.evaluate_reading(stype, val)
            if res.get("is_anomaly"):
                anomalies.append(res)

        # 2. Extract features
        features = TelemetryFeatureExtractor.extract_features(historical_telemetry or [])

        # 3. Evaluate disease risks
        diseases = ["WSSV", "VIBRIOSIS", "EMS/AHPND"]
        disease_results = {}
        for d in diseases:
            disease_results[d] = ExplainableDiseaseRiskModel.evaluate_risk(
                disease_key=d,
                do_mg_l=do_val,
                temp_c=temp_val,
                ammonia_mg_l=ammonia_val,
                feeding_drop_pct=100.0 - current_telemetry.get("feeding_intake_pct", 100.0),
                temp_fluctuation_24h=features.get("temp_swing_24h", 2.0)
            )

        return {
            "status": "INFERENCE_SUCCESS",
            "pond_id": pond_id,
            "features": features,
            "anomalies": anomalies,
            "disease_risks": disease_results,
            "disclaimer": ExplainableDiseaseRiskModel.MODEL_METADATA["clinical_disclaimer"]
        }
