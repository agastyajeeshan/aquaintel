# AquaIntel — AI & Machine Learning Architecture & Dataset Integration

AquaIntel combines multi-tier water-quality anomaly detection, metabolic feeding optimization, explainable physiological stress scoring, and machine learning multi-pathogen vulnerability modeling for commercial *Litopenaeus vannamei* aquaculture.

---

## 1. Dataset Package & ZIP Integration Workflow

### A. ZIP Placement & Discovery
Place the dataset ZIP archive directly in the **project root folder** of the AquaIntel repository:
```
AquaIntel/
├── AquaIntel_Prawn_Disease_Dataset_Starter_Pack.zip
├── Makefile
├── compose.yaml
├── backend/
├── frontend/
└── ai/
```
The automated validation module (`ai/preprocessing/validator.py`) scans the root and immediate subdirectories for any ZIP file matching `aquaintel`, `dataset`, or `disease`, and extracts its contents to `ai/data/disease/raw/`. The original ZIP file is preserved intact and excluded from Git commits via `.gitignore`.

### B. Supplied File Inventory
| Filename | Purpose & Content | Status / Provenance |
|---|---|---|
| `synthetic_demo_data_NOT_FOR_VALIDATED_TRAINING.csv` | 1,200 rows with water parameters, culture stage, biomass, mortality, feeding response, and disease labels | **SYNTHETIC DEMO DATA ONLY** (Not for real farm decisions) |
| `real_farm_data_template.csv` | 28-column standardized schema for ingesting real commercial pond logs | Empty Schema Template |
| `disease_reference.csv` | Taxonomic details, signs, and laboratory confirmation guidance for 8 conditions | Planning & Annotation Reference |
| `data_dictionary.csv` | Field guidance, sensor units, and label definition guidelines | Data Dictionary |
| `synthetic_class_counts.csv` | Target distribution counts across 7 classes | Synthetic Reference |

---

## 2. Synthetic vs. Real Data Mandate

Under Section 5 of the AquaIntel Master Specification:
- **Synthetic Data Usage:** Used strictly for pipeline verification, software integration testing, and UI demonstrations.
- **Model Status:** Models trained on synthetic fixtures are tagged with:
  `status: "NOT_VALIDATED_FOR_REAL_WORLD_DISEASE_PREDICTION"`
  `is_synthetic: true`
- **Clinical Governance:** Water-quality sensors measure environmental vulnerability stressors (hypoxia, osmotic shock, unionized ammonia toxicity). Telemetry **cannot** diagnose viruses or bacteria. Laboratory RT-qPCR assays and qualified veterinary inspection are mandatory before administering clinical treatments.

---

## 3. Data Validation & Preprocessing Pipeline

### Leakage-Free Preprocessing (`ai/preprocessing/pipeline.py`)
To prevent data contamination:
1. **Stratified Split:** Raw data is split into 80% train (960 rows) and 20% held-out test (240 rows).
2. **Train-Only Imputation:** Median imputers and feature scalers are fitted strictly on the train split and then applied to the test split.
3. **Audit Emission:** Outputs `ai/data/disease/reports/data_quality_report.json` and `data_quality_report.md`.

---

## 4. Model Catalog

### Model A: Multi-Tier Anomaly Detector (`ai/models/anomaly_detector.py`)
- **Tier 1 (Hard Bounds):** Detects probe disconnection and ADC clipping (e.g. DO < 0.0 or > 25.0 mg/L).
- **Tier 2 (Rate-of-Change):** Flags rapid hypoxic crashes (> 2.5 mg/L DO drop within 1 hour).
- **Tier 3 (Frozen Telemetry):** Flags 5 consecutive identical readings (sensor bus lockup).

### Model B: Precision Feeding Controller (`backend/app/core/feeding_engine.py`)
- Standardized feed tables across DOC 1–120 with hard environmental safety gates:
  - DO < 3.2 mg/L: 100% feed shutdown.
  - Ammonia > 0.12 mg/L: 50% feed cut.

### Model C: Multi-Pathogen Disease Classifier (`ai/training/train_disease_classifier.py`)
- **Algorithm:** Balanced Random Forest Classifier (150 estimators, class-weighted) vs. Baseline Logistic Regression.
- **Classes Supported:** `HEALTHY`, `WSSV`, `VIBRIOSIS`, `AHPND_EMS`, `BLACK_GILL`, `MIXED_OR_UNRESOLVED`, `EHP`.
- **Evaluated Performance:**
  - Macro F1: 0.2314
  - Baseline Logistic Regression Macro F1: 0.2902
  - Overall Accuracy: 55.0%
- **Artifacts:**
  - Serialized Model: `ai/artifacts/disease_risk_pipeline.joblib`
  - Model Metadata: `ai/artifacts/metadata.json`
  - Model Card: `ai/artifacts/model_card.md`

### Model D: Explainable Decision Matrix Fallback (`ai/models/disease_model.py`)
- Transparent rule-based additive stressor scoring providing guaranteed baseline functionality when ML artifacts are absent.

---

## 5. Mac Terminal Commands

### Run Data Validation Audit
```bash
cd /Users/jeeshan/Documents/projects/aquaintel
backend/venv/bin/python ai/preprocessing/validator.py
```

### Run Leakage-Free Preprocessing
```bash
backend/venv/bin/python ai/preprocessing/pipeline.py
```

### Retrain Disease Classifier
```bash
backend/venv/bin/python ai/training/train_disease_classifier.py
```

### Run Full Test Suite
```bash
cd backend
venv/bin/pytest -v tests/
```

### Start System
```bash
# Terminal 1: Backend
cd backend && venv/bin/python run.py

# Terminal 2: Frontend
cd frontend && npm run dev
```

---

## 6. How to Ingest Real Farm Data & Transition to Validated Models

1. **Format Observations:** Populate `ai/data/disease/raw/real_farm_data_YYMMDD.csv` according to `real_farm_data_template.csv`.
2. **Clinical Confirmation:**
   - Mark `label_status` as `CONFIRMED` only when verified via RT-qPCR or bacteriological culture.
   - Record `lab_test_type` (e.g. `RT-qPCR-IQ2000`, `TCBS-Agar-CFU`), `lab_test_date`, and `lab_test_result`.
   - Use `SUSPECTED` or `UNRESOLVED` for check-tray observations without PCR.
3. **Model Promotion:**
   - Re-run `validator.py` and `train_disease_classifier.py`.
   - The pipeline will detect `real_rows > 0` and update provenance from `100%_SYNTHETIC_DEMO_DATA` to `CONTAINS_CONFIRMED_REAL_LABELS`.
   - Once validated against an independent cohort of ponds with clinical outcomes, update the model card validation status.
