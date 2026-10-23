import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Pond, Sensor
from ..core.iot_simulator import iot_simulator

# Import AI modules
import sys
REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from ai.preprocessing.validator import DatasetValidator
from ai.inference.disease_classifier import DiseaseRiskInferenceEngine

router = APIRouter(prefix="/ai", tags=["AI & Disease Intelligence"])

REPORTS_DIR = REPO_ROOT / "ai" / "data" / "disease" / "reports"
ARTIFACTS_DIR = REPO_ROOT / "ai" / "artifacts"


class DiseaseRiskEvaluationRequest(BaseModel):
    pond_id: Optional[int] = Field(None, description="Pond ID to automatically load recent telemetry")
    culture_day: Optional[int] = Field(45, ge=1, le=180)
    temperature_c: Optional[float] = Field(None, ge=15.0, le=42.0)
    do_mg_l: Optional[float] = Field(None, ge=0.0, le=25.0)
    ph: Optional[float] = Field(None, ge=5.0, le=11.0)
    salinity_ppt: Optional[float] = Field(None, ge=0.0, le=50.0)
    tan_mg_l: Optional[float] = Field(None, ge=0.0, le=10.0)
    unionized_nh3_mg_l: Optional[float] = Field(None, ge=0.0, le=2.0)
    turbidity_ntu: Optional[float] = Field(None, ge=0.0, le=200.0)
    water_level_m: Optional[float] = Field(None, ge=0.2, le=3.5)
    estimated_biomass_kg: Optional[float] = Field(None, ge=0.0)
    feed_kg_last_24h: Optional[float] = Field(None, ge=0.0)
    mortality_count_24h: Optional[float] = Field(0.0, ge=0.0)
    abnormal_behavior_observed: Optional[int] = Field(0, ge=0, le=1)
    feeding_response: Optional[str] = Field("NORMAL", description="NORMAL, REDUCED, ABNORMAL, UNKNOWN")


@router.post("/data/validate")
def validate_dataset():
    """
    Executes the automated dataset validation pipeline:
    - Scans for dataset ZIP / raw CSV files
    - Validates schemas, missingness, physical bounds
    - Categorizes synthetic demo fixtures vs real farm records
    - Updates data quality report
    """
    try:
        report = DatasetValidator.validate_dataset()
        return {
            "status": "SUCCESS",
            "report": report
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation pipeline failed: {str(e)}")


@router.get("/data/quality-report")
def get_data_quality_report():
    """
    Retrieves the latest dataset quality & validation report.
    """
    report_file = REPORTS_DIR / "data_quality_report.json"
    if not report_file.exists():
        # Trigger validation if report doesn't exist
        report = DatasetValidator.validate_dataset()
        return report

    try:
        with open(report_file, "r") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read quality report: {str(e)}")


@router.get("/models/status")
def get_ai_models_status():
    """
    Retrieves the AI/ML model registry status, version, evaluation metrics, and limitations.
    """
    metadata_file = ARTIFACTS_DIR / "metadata.json"
    model_exists = (ARTIFACTS_DIR / "disease_risk_pipeline.joblib").exists()

    if not metadata_file.exists():
        return {
            "model_status": "READY_FALLBACK_RULE_BASED",
            "model_id": "AQUAINTEL-DIS-V2.1-EXPLAINABLE",
            "version": "2.1.0-baseline",
            "is_synthetic_model": False,
            "validation_status": "RULE_BASED_PHYSIOLOGICAL_BASELINE",
            "pipeline_available": model_exists,
            "clinical_disclaimer": "DISCLAIMER: Sensor telemetry provides early warning risk estimation. Laboratory PCR assays are required for definitive diagnosis."
        }

    try:
        with open(metadata_file, "r") as f:
            meta = json.load(f)
            meta["pipeline_artifact_present"] = model_exists
            return meta
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read model metadata: {str(e)}")


@router.post("/disease-risk/evaluate")
def evaluate_disease_risk(
    req: DiseaseRiskEvaluationRequest,
    db: Session = Depends(get_db)
):
    """
    Evaluates multi-pathogen disease vulnerability using the trained ML pipeline (with rule-based fallback).
    Returns top condition, probability distribution, contributing stressors, data freshness, and clinical disclaimers.
    """
    pond_id = req.pond_id
    doc = req.culture_day or 45
    biomass = req.estimated_biomass_kg or 850.0

    # Auto-fill missing water quality parameters from live pond readings if pond_id provided
    temp_val = req.temperature_c
    do_val = req.do_mg_l
    ph_val = req.ph
    salinity_val = req.salinity_ppt
    ammonia_val = req.tan_mg_l
    nh3_val = req.unionized_nh3_mg_l

    data_freshness = "MANUAL_INPUT"
    if pond_id is not None:
        pond = db.query(Pond).filter(Pond.id == pond_id).first()
        if pond:
            if pond.current_age_days:
                doc = pond.current_age_days
            if pond.estimated_biomass_kg:
                biomass = pond.estimated_biomass_kg

        sim_readings = iot_simulator.generate_current_pond_readings(pond_id)
        m = sim_readings["metrics"]
        temp_val = temp_val if temp_val is not None else m["temperature"]["value"]
        do_val = do_val if do_val is not None else m["do"]["value"]
        ph_val = ph_val if ph_val is not None else m["ph"]["value"]
        salinity_val = salinity_val if salinity_val is not None else m["salinity"]["value"]
        ammonia_val = ammonia_val if ammonia_val is not None else m["ammonia"]["value"]
        nh3_val = nh3_val if nh3_val is not None else (ammonia_val * 0.1)
        data_freshness = f"LIVE_SIMULATED_POLL_{sim_readings.get('timestamp', 'NOW')}"

    # Defaults if still None
    temp_val = temp_val if temp_val is not None else 28.5
    do_val = do_val if do_val is not None else 5.5
    ph_val = ph_val if ph_val is not None else 7.9
    salinity_val = salinity_val if salinity_val is not None else 20.0
    ammonia_val = ammonia_val if ammonia_val is not None else 0.05
    nh3_val = nh3_val if nh3_val is not None else 0.015
    turbidity_val = req.turbidity_ntu if req.turbidity_ntu is not None else 25.0
    water_level_val = req.water_level_m if req.water_level_m is not None else 1.2
    feed_val = req.feed_kg_last_24h if req.feed_kg_last_24h is not None else 22.0
    mortality_val = req.mortality_count_24h if req.mortality_count_24h is not None else 0.0
    abnormal_val = req.abnormal_behavior_observed if req.abnormal_behavior_observed is not None else 0
    resp_val = req.feeding_response or "NORMAL"

    # Execute inference
    eval_result = DiseaseRiskInferenceEngine.predict_risk(
        culture_day=doc,
        temperature_c=temp_val,
        do_mg_l=do_val,
        ph=ph_val,
        salinity_ppt=salinity_val,
        tan_mg_l=ammonia_val,
        unionized_nh3_mg_l=nh3_val,
        turbidity_ntu=turbidity_val,
        water_level_m=water_level_val,
        estimated_biomass_kg=biomass,
        feed_kg_last_24h=feed_val,
        mortality_count_24h=mortality_val,
        abnormal_behavior_observed=abnormal_val,
        feeding_response=resp_val
    )

    eval_result["pond_id"] = pond_id
    eval_result["evaluation_timestamp"] = datetime.now(timezone.utc).isoformat()
    eval_result["data_freshness"] = data_freshness
    eval_result["input_summary"] = {
        "temperature_c": temp_val,
        "do_mg_l": do_val,
        "ph": ph_val,
        "salinity_ppt": salinity_val,
        "tan_mg_l": ammonia_val,
        "unionized_nh3_mg_l": nh3_val,
        "culture_day": doc,
        "feeding_response": resp_val,
        "mortality_count_24h": mortality_val
    }

    return eval_result
