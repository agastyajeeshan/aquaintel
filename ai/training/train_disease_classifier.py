import os
import json
from pathlib import Path
from typing import Dict, Any
import pandas as pd
import numpy as np
import joblib

from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, f1_score, accuracy_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
AI_DATA_DIR = REPO_ROOT / "ai" / "data" / "disease"
PROCESSED_DATA_DIR = AI_DATA_DIR / "processed"
ARTIFACTS_DIR = REPO_ROOT / "ai" / "artifacts"
REPORTS_DIR = AI_DATA_DIR / "reports"

FEATURE_COLS = [
    "culture_day",
    "temperature_c",
    "do_mg_l",
    "ph",
    "salinity_ppt",
    "tan_mg_l",
    "unionized_nh3_mg_l",
    "turbidity_ntu",
    "water_level_m",
    "estimated_biomass_kg",
    "feed_kg_last_24h",
    "mortality_count_24h",
    "abnormal_behavior_observed",
    "feed_resp_NORMAL",
    "feed_resp_REDUCED",
    "feed_resp_ABNORMAL",
    "feed_resp_UNKNOWN"
]

TARGET_COL = "disease_label"


class DiseaseClassifierTrainer:
    """
    Model C: Prawn Disease Risk ML Training & Evaluation Pipeline
    - Trains baseline Logistic Regression and production-candidate Random Forest
    - Evaluates on clean, held-out test split (240 rows)
    - Emits per-class precision, recall, F1, and confusion matrix
    - Serializes pipeline to ai/artifacts/disease_risk_pipeline.joblib
    - Marks metadata explicitly as NOT_VALIDATED_FOR_REAL_WORLD_DISEASE_PREDICTION
    """

    @classmethod
    def train_and_evaluate(cls) -> Dict[str, Any]:
        ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
        REPORTS_DIR.mkdir(parents=True, exist_ok=True)

        train_path = PROCESSED_DATA_DIR / "train.csv"
        test_path = PROCESSED_DATA_DIR / "test.csv"

        if not train_path.exists() or not test_path.exists():
            from ai.preprocessing.pipeline import DataPreprocessingPipeline
            prep = DataPreprocessingPipeline()
            prep.prepare_and_split()

        train_df = pd.read_csv(train_path)
        test_df = pd.read_csv(test_path)

        X_train = train_df[FEATURE_COLS]
        y_train = train_df[TARGET_COL]

        X_test = test_df[FEATURE_COLS]
        y_test = test_df[TARGET_COL]

        classes = sorted(list(y_train.unique()))

        # 1. Train Baseline Model (Logistic Regression)
        baseline_pipeline = Pipeline([
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42))
        ])
        baseline_pipeline.fit(X_train, y_train)
        y_pred_baseline = baseline_pipeline.predict(X_test)
        baseline_macro_f1 = float(f1_score(y_test, y_pred_baseline, average="macro"))

        # 2. Train Primary Model (Balanced Random Forest)
        primary_pipeline = Pipeline([
            ("scaler", StandardScaler()),
            ("clf", RandomForestClassifier(
                n_estimators=150,
                max_depth=10,
                min_samples_split=4,
                class_weight="balanced_subsample",
                random_state=42,
                n_jobs=-1
            ))
        ])
        primary_pipeline.fit(X_train, y_train)
        y_pred = primary_pipeline.predict(X_test)
        y_prob = primary_pipeline.predict_proba(X_test)

        # 3. Comprehensive Evaluation
        acc = float(accuracy_score(y_test, y_pred))
        macro_f1 = float(f1_score(y_test, y_pred, average="macro"))
        weighted_f1 = float(f1_score(y_test, y_pred, average="weighted"))

        clf_report_dict = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
        conf_matrix = confusion_matrix(y_test, y_pred, labels=classes).tolist()

        # Feature importances
        rf_model = primary_pipeline.named_steps["clf"]
        importances = dict(zip(FEATURE_COLS, [round(float(x), 4) for x in rf_model.feature_importances_]))
        sorted_importances = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True))

        # 4. Serialize Pipeline Artifact
        model_artifact_path = ARTIFACTS_DIR / "disease_risk_pipeline.joblib"
        joblib.dump(primary_pipeline, model_artifact_path)

        # 5. Model Metadata & Evaluation Report
        metadata = {
            "model_id": "AQUAINTEL-RF-DISEASE-V1.0-SYNTHETIC",
            "model_name": "Multi-Pathogen Balanced Random Forest Classifier",
            "version": "1.0.0-synthetic",
            "created_at": pd.Timestamp.now("UTC").isoformat(),
            "target_species": "Litopenaeus vannamei",
            "target_classes": classes,
            "feature_columns": FEATURE_COLS,
            "training_dataset": "synthetic_demo_data_NOT_FOR_VALIDATED_TRAINING.csv",
            "is_synthetic": True,
            "validation_status": "NOT_VALIDATED_FOR_REAL_WORLD_DISEASE_PREDICTION",
            "provenance": "Synthetic Demonstration Fixture (1,200 rows total: 960 train / 240 test)",
            "evaluation_metrics": {
                "accuracy": round(acc, 4),
                "macro_f1": round(macro_f1, 4),
                "weighted_f1": round(weighted_f1, 4),
                "baseline_logistic_regression_macro_f1": round(baseline_macro_f1, 4),
                "per_class_report": clf_report_dict,
                "confusion_matrix": {
                    "labels": classes,
                    "matrix": conf_matrix
                }
            },
            "top_features": sorted_importances,
            "limitations": [
                "Trained exclusively on synthetic demonstration data.",
                "Not validated against laboratory-confirmed PCR clinical outcomes.",
                "Cannot be deployed for real-world therapeutic or farm culling decisions.",
                "Water quality telemetry alone indicates environmental vulnerability, not definitive infection."
            ],
            "clinical_disclaimer": "CRITICAL NOTICE: Laboratory RT-qPCR molecular testing and veterinarian pathology examination are required before taking farm intervention decisions."
        }

        # Save metadata JSON
        with open(ARTIFACTS_DIR / "metadata.json", "w") as f:
            json.dump(metadata, f, indent=2)

        with open(REPORTS_DIR / "evaluation_report.json", "w") as f:
            json.dump(metadata, f, indent=2)

        # Save Model Card Markdown
        cls._generate_model_card(metadata, ARTIFACTS_DIR / "model_card.md")

        return metadata

    @classmethod
    def _generate_model_card(cls, metadata: Dict[str, Any], output_path: Path):
        metrics = metadata["evaluation_metrics"]
        card = f"""# Model Card: {metadata['model_name']}

**Model Identifier:** `{metadata['model_id']}`  
**Version:** `{metadata['version']}`  
**Status:** `{metadata['validation_status']}`  
**Synthetic Data Flag:** `{metadata['is_synthetic']}`  
**Generated:** `{metadata['created_at']}`

> [!CAUTION]
> **EXPERIMENTAL / UNVALIDATED MODEL DISCLAIMER**  
> Under Section 5 and 6.B of the AquaIntel Master Specification, this model is trained strictly on synthetic demonstration fixture data.  
> **IT MUST NOT BE USED FOR REAL-WORLD FARM VETERINARY OR MORTALITY CONTROL DECISIONS.**

---

## 1. Intended Domain & Use Case
- **Intended Use:** End-to-end software pipeline verification, user interface demonstration, automated testing, and developer benchmarking.
- **Target Organism:** *Litopenaeus vannamei* (Pacific White Shrimp).
- **Target Pathogen Classes:** {', '.join(metadata['target_classes'])}.

## 2. Evaluation Results on Held-Out Test Set (240 Synthetic Rows)
- **Overall Accuracy:** {metrics['accuracy'] * 100:.2f}%
- **Macro F1-Score:** {metrics['macro_f1']:.4f} (vs Baseline Logistic Regression: {metrics['baseline_logistic_regression_macro_f1']:.4f})
- **Weighted F1-Score:** {metrics['weighted_f1']:.4f}

### Per-Class Performance
| Pathogen Class | Precision | Recall | F1-Score | Support |
|---|---|---|---|---|
"""
        for cls_name, vals in metrics["per_class_report"].items():
            if isinstance(vals, dict) and "f1-score" in vals:
                card += f"| `{cls_name}` | {vals['precision']:.3f} | {vals['recall']:.3f} | {vals['f1-score']:.3f} | {int(vals['support'])} |\n"

        card += "\n## 3. Top Feature Importances\n"
        for feat, imp in list(metadata["top_features"].items())[:8]:
            card += f"- **`{feat}`**: {imp * 100:.2f}%\n"

        card += f"""
## 4. Known Limitations & Clinical Warnings
"""
        for lim in metadata["limitations"]:
            card += f"- {lim}\n"

        card += f"\n> {metadata['clinical_disclaimer']}\n"

        with open(output_path, "w") as f:
            f.write(card)


if __name__ == "__main__":
    res = DiseaseClassifierTrainer.train_and_evaluate()
    print("Training finished. Model ID:", res["model_id"], "Macro F1:", res["evaluation_metrics"]["macro_f1"])
