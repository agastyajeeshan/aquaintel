# AquaIntel Prawn Disease Dataset Starter Pack

## Included files
- `disease_reference.csv`: annotation planning reference, not a diagnostic key.
- `real_farm_data_template.csv`: empty schema for real pond observations.
- `synthetic_demo_data_NOT_FOR_VALIDATED_TRAINING.csv`: 1,200 synthetic rows to test ingestion, preprocessing, dashboard and pipeline plumbing only.
- `data_dictionary.csv`: field guidance.
- `synthetic_class_counts.csv`: counts for the synthetic fixture.

## Critical limitation
The synthetic CSV is NOT real farm or clinical data. Labels and feature patterns are synthetic and not validated by aquaculture experts. Use it only to test code paths. Do not use model scores/metrics from it as evidence of real disease prediction, and do not deploy a model trained on it for farm decisions.

For real supervised training, collect pond/time-window observations with reliable labels, preferably lab-confirmed or reviewed by qualified aquatic animal health professionals. Keep suspected, confirmed, ruled-out, and unresolved cases distinct. Do not infer a disease label from water parameters alone.

## Recommended modeling
Start with water-quality anomaly detection and alert triage. For disease-risk prediction, define the prediction horizon and target label first, then split by pond/farm and time to avoid leakage. Keep a final untouched test set and report precision, recall, F1, PR-AUC, confusion matrix, and calibration where appropriate.

## Public image dataset
ShrimpDiseaseImageBD / ShrimpDiseaseBD:
- Mendeley Data: https://data.mendeley.com/datasets/jhrtdj9txm/2
- Article: https://pmc.ncbi.nlm.nih.gov/articles/PMC12048804/
The published image dataset contains categories including Healthy, Black Gill, WSSV, and combined Black Gill + WSSV. It is an image dataset, not pond sensor data. Review license and citation terms before use.

Disease observations and visible symptoms are not definitive diagnoses. Use appropriate laboratory confirmation and expert assessment.
