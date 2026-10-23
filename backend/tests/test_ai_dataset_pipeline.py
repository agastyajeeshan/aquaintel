import pytest
import os
import json
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.database import engine, Base, SessionLocal
from app.models import Sensor
from ai.preprocessing.validator import DatasetValidator
from ai.preprocessing.pipeline import DataPreprocessingPipeline
from ai.training.train_disease_classifier import DiseaseClassifierTrainer
from ai.inference.disease_classifier import DiseaseRiskInferenceEngine

client = TestClient(app)
REPO_ROOT = Path(__file__).resolve().parent.parent.parent


def test_zip_discovery_and_extraction():
    """Verify dataset ZIP is discovered in repo root and extracted to ai/data/disease/raw/."""
    zip_path = DatasetValidator.discover_and_extract_zip()
    assert zip_path is not None
    assert zip_path.exists()
    assert "AquaIntel" in zip_path.name or "zip" in zip_path.suffix

    raw_dir = REPO_ROOT / "ai" / "data" / "disease" / "raw"
    assert (raw_dir / "synthetic_demo_data_NOT_FOR_VALIDATED_TRAINING.csv").exists()
    assert (raw_dir / "disease_reference.csv").exists()
    assert (raw_dir / "data_dictionary.csv").exists()


def test_csv_schema_and_range_validation():
    """Verify validation audits total rows, missing columns, and missing values."""
    report = DatasetValidator.validate_dataset()
    assert report["total_rows_loaded"] == 1200
    assert report["total_columns"] >= 20
    assert len(report["missing_columns"]) == 0
    assert report["duplicate_records"] == 0

    # Check missing values audit
    missing_by_col = report["missing_values_by_column"]
    assert "do_mg_l" in missing_by_col
    assert missing_by_col["do_mg_l"]["missing_count"] == 149
    assert "ph" in missing_by_col
    assert missing_by_col["ph"]["missing_count"] == 84


def test_synthetic_provenance_flagging():
    """Verify that dataset is strictly marked as 100% synthetic and unvalidated."""
    report = DatasetValidator.validate_dataset()
    prov = report["provenance"]
    assert prov["status"] == "100%_SYNTHETIC_DEMO_DATA"
    assert prov["validation_status"] == "NOT_VALIDATED_FOR_REAL_WORLD_DISEASE_PREDICTION"
    assert prov["synthetic_rows"] == 1200
    assert prov["real_rows"] == 0
    assert prov["confirmed_clinical_labels"] == 0
    assert "CRITICAL" in report["critical_disclaimer"]


def test_data_leakage_protection_in_split():
    """Verify train/test split prevents leakage and fits preprocessing on train only."""
    prep = DataPreprocessingPipeline(test_size=0.2, random_state=42)
    res = prep.prepare_and_split()
    assert res["status"] == "PREPROCESSING_SUCCESS"
    assert res["train_rows"] == 960
    assert res["test_rows"] == 240
    assert prep.fitted is True

    # Verify class balance preserved
    train_dist = res["train_class_distribution"]
    test_dist = res["test_class_distribution"]
    assert "HEALTHY" in train_dist and "HEALTHY" in test_dist
    assert "WSSV" in train_dist and "WSSV" in test_dist


def test_disease_model_training_and_artifacts():
    """Verify training executes, logs baseline comparison, and generates artifacts."""
    meta = DiseaseClassifierTrainer.train_and_evaluate()
    assert meta["model_id"] == "AQUAINTEL-RF-DISEASE-V1.0-SYNTHETIC"
    assert meta["is_synthetic"] is True
    assert meta["validation_status"] == "NOT_VALIDATED_FOR_REAL_WORLD_DISEASE_PREDICTION"

    metrics = meta["evaluation_metrics"]
    assert "accuracy" in metrics
    assert "macro_f1" in metrics
    assert "baseline_logistic_regression_macro_f1" in metrics
    assert len(metrics["per_class_report"]) >= 7

    # Check files exist on disk
    artifacts_dir = REPO_ROOT / "ai" / "artifacts"
    assert (artifacts_dir / "disease_risk_pipeline.joblib").exists()
    assert (artifacts_dir / "metadata.json").exists()
    assert (artifacts_dir / "model_card.md").exists()


def test_disease_inference_engine_prediction():
    """Verify ML pipeline inference with probabilities and clinical disclaimers."""
    res = DiseaseRiskInferenceEngine.predict_risk(
        temperature_c=25.0,
        do_mg_l=3.0,
        mortality_count_24h=20,
        feeding_response="REDUCED"
    )
    assert res["evaluation_type"] == "MACHINE_LEARNING_PIPELINE"
    assert res["is_synthetic_model"] is True
    assert res["validation_status"] == "NOT_VALIDATED_FOR_REAL_WORLD_DISEASE_PREDICTION"
    assert "pathogen_probability_distribution" in res
    assert len(res["pathogen_probability_distribution"]) == 7
    assert any("dissolved oxygen" in s.lower() for s in res["contributing_stressors"])
    assert "PCR" in res["clinical_disclaimer"]


def test_api_ai_data_validate_endpoint():
    """Verify POST /api/v1/ai/data/validate endpoint."""
    res = client.post("/api/v1/ai/data/validate")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["report"]["total_rows_loaded"] == 1200


def test_api_ai_quality_report_endpoint():
    """Verify GET /api/v1/ai/data/quality-report endpoint."""
    res = client.get("/api/v1/ai/data/quality-report")
    assert res.status_code == 200
    report = res.json()
    assert report["provenance"]["status"] == "100%_SYNTHETIC_DEMO_DATA"


def test_api_ai_models_status_endpoint():
    """Verify GET /api/v1/ai/models/status endpoint."""
    res = client.get("/api/v1/ai/models/status")
    assert res.status_code == 200
    status = res.json()
    assert status["model_id"] == "AQUAINTEL-RF-DISEASE-V1.0-SYNTHETIC"
    assert status["is_synthetic"] is True
    assert status["pipeline_artifact_present"] is True


def test_api_ai_disease_risk_evaluate_endpoint():
    """Verify POST /api/v1/ai/disease-risk/evaluate endpoint with pond telemetry auto-load."""
    payload = {
        "pond_id": 1,
        "temperature_c": 24.8,
        "do_mg_l": 2.9,
        "mortality_count_24h": 30,
        "feeding_response": "ABNORMAL"
    }
    res = client.post("/api/v1/ai/disease-risk/evaluate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["pond_id"] == 1
    assert data["risk_category"] in ["HIGH", "CRITICAL"]
    assert "pathogen_probability_distribution" in data
    assert "PCR" in data["clinical_disclaimer"]
