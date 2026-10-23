# AquaIntel Data Quality & Validation Audit Report

**Generated:** `2026-10-23T07:47:03.188956+00:00`  
**Dataset Source File:** `synthetic_demo_data_NOT_FOR_VALIDATED_TRAINING.csv`  
**Source ZIP Archive:** `AquaIntel_Prawn_Disease_Dataset_Starter_Pack copy.zip`  
**Provenance Status:** `100%_SYNTHETIC_DEMO_DATA`  
**Model Validation Classification:** `NOT_VALIDATED_FOR_REAL_WORLD_DISEASE_PREDICTION`

> [!WARNING]
> **SYNTHETIC DEMO DATA NOTICE:**  
> Total rows: 1200 | Synthetic: 1200 | Real farm observations: 0 | Confirmed clinical labels: 0  
> This dataset is designated for pipeline plumbing, frontend demonstration, and test suite verification only. It is **NOT VALIDATED** for actual veterinary or farm mortality intervention decisions.

---

## 1. Dataset Overview & Dimensions
- **Total Rows Evaluated:** 1200
- **Total Columns:** 28
- **Duplicate Record IDs:** 0
- **Missing Required Schema Columns:** 0

## 2. Class Distribution (Prawn Disease Target)
| Target Class | Row Count | Percentage |
|---|---|---|
| `HEALTHY` | 613 | 51.1% |
| `WSSV` | 177 | 14.8% |
| `VIBRIOSIS` | 122 | 10.2% |
| `AHPND_EMS` | 121 | 10.1% |
| `BLACK_GILL` | 74 | 6.2% |
| `MIXED_OR_UNRESOLVED` | 50 | 4.2% |
| `EHP` | 43 | 3.6% |

## 3. Data Quality & Missingness
| Column | Missing Count | Missing % |
|---|---|---|
| `do_mg_l` | 149 | 12.42% |
| `ph` | 84 | 7.0% |
| `lab_test_type` | 1200 | 100.0% |
| `lab_test_date` | 1200 | 100.0% |
| `lab_test_result` | 1200 | 100.0% |
| `observer_id` | 1200 | 100.0% |

## 4. Range & Physical Bound Validation
✅ All sensor and physiological parameters fall within expected biological limits.

---
## 5. Regulatory & Clinical Mandate
Water-quality telemetry measures environmental vulnerability stressors (hypoxia, osmotic shock, toxic unionized ammonia). **It does not provide definitive pathogen confirmation.** Laboratory RT-qPCR assays and pathology inspection by certified aquatic animal health specialists are mandatory before administering clinical treatments.
