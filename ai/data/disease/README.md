# AquaIntel Disease Dataset Directory

This directory stores raw datasets, processed training/testing splits, and validation audit reports.

## Directory Structure
- `raw/`: Unaltered CSV files extracted from the manual dataset ZIP archive.
  - `synthetic_demo_data_NOT_FOR_VALIDATED_TRAINING.csv`: 1,200 synthetic rows for pipeline testing.
  - `real_farm_data_template.csv`: Standardized schema for real commercial pond logs.
  - `disease_reference.csv`: Pathogen taxonomic and clinical confirmation reference.
  - `data_dictionary.csv`: Field guidance.
  - `synthetic_class_counts.csv`: Reference class counts.
- `processed/`: Leakage-free split datasets.
  - `train.csv`: 960 rows (80% split), imputers and scalers fitted strictly here.
  - `test.csv`: 240 rows (20% held-out split).
- `reports/`:
  - `data_quality_report.json`: Machine-readable validation audit.
  - `data_quality_report.md`: Human-readable markdown audit.
  - `evaluation_report.json`: ML evaluation metrics on the held-out test split.

## Adding Real Farm Data
To ingest real pond observations:
1. Copy `raw/real_farm_data_template.csv` to `raw/real_farm_data_YOURFARM.csv`.
2. Populate real sensor telemetry, feeding response, mortality counts, and clinical RT-qPCR assay outcomes.
3. Mark `label_status` as `CONFIRMED` only when verified by an aquatic veterinary laboratory.
4. Run:
   ```bash
   python ai/preprocessing/validator.py
   python ai/training/train_disease_classifier.py
   ```
