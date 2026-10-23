# Model Card: Multi-Pathogen Balanced Random Forest Classifier

**Model Identifier:** `AQUAINTEL-RF-DISEASE-V1.0-SYNTHETIC`  
**Version:** `1.0.0-synthetic`  
**Status:** `NOT_VALIDATED_FOR_REAL_WORLD_DISEASE_PREDICTION`  
**Synthetic Data Flag:** `True`  
**Generated:** `2026-10-23T07:47:03.129253+00:00`

> [!CAUTION]
> **EXPERIMENTAL / UNVALIDATED MODEL DISCLAIMER**  
> Under Section 5 and 6.B of the AquaIntel Master Specification, this model is trained strictly on synthetic demonstration fixture data.  
> **IT MUST NOT BE USED FOR REAL-WORLD FARM VETERINARY OR MORTALITY CONTROL DECISIONS.**

---

## 1. Intended Domain & Use Case
- **Intended Use:** End-to-end software pipeline verification, user interface demonstration, automated testing, and developer benchmarking.
- **Target Organism:** *Litopenaeus vannamei* (Pacific White Shrimp).
- **Target Pathogen Classes:** AHPND_EMS, BLACK_GILL, EHP, HEALTHY, MIXED_OR_UNRESOLVED, VIBRIOSIS, WSSV.

## 2. Evaluation Results on Held-Out Test Set (240 Synthetic Rows)
- **Overall Accuracy:** 55.00%
- **Macro F1-Score:** 0.2314 (vs Baseline Logistic Regression: 0.2902)
- **Weighted F1-Score:** 0.4937

### Per-Class Performance
| Pathogen Class | Precision | Recall | F1-Score | Support |
|---|---|---|---|---|
| `AHPND_EMS` | 0.083 | 0.042 | 0.056 | 24 |
| `BLACK_GILL` | 0.333 | 0.200 | 0.250 | 15 |
| `EHP` | 0.000 | 0.000 | 0.000 | 9 |
| `HEALTHY` | 0.700 | 0.911 | 0.792 | 123 |
| `MIXED_OR_UNRESOLVED` | 0.000 | 0.000 | 0.000 | 10 |
| `VIBRIOSIS` | 0.200 | 0.208 | 0.204 | 24 |
| `WSSV` | 0.324 | 0.314 | 0.319 | 35 |
| `macro avg` | 0.234 | 0.239 | 0.231 | 240 |
| `weighted avg` | 0.455 | 0.550 | 0.494 | 240 |

## 3. Top Feature Importances
- **`mortality_count_24h`**: 13.36%
- **`turbidity_ntu`**: 11.36%
- **`estimated_biomass_kg`**: 7.77%
- **`salinity_ppt`**: 7.45%
- **`feed_kg_last_24h`**: 7.32%
- **`temperature_c`**: 7.02%
- **`do_mg_l`**: 6.93%
- **`culture_day`**: 6.67%

## 4. Known Limitations & Clinical Warnings
- Trained exclusively on synthetic demonstration data.
- Not validated against laboratory-confirmed PCR clinical outcomes.
- Cannot be deployed for real-world therapeutic or farm culling decisions.
- Water quality telemetry alone indicates environmental vulnerability, not definitive infection.

> CRITICAL NOTICE: Laboratory RT-qPCR molecular testing and veterinarian pathology examination are required before taking farm intervention decisions.
