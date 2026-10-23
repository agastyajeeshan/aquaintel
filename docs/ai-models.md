# AquaIntel — AI & Machine Learning Architecture

AquaIntel deploys specialized, decoupled analytical and decision-support models rather than an unmaintainable monolith. Every model includes explicit data provenance, feature schemas, and documented limitations.

---

## 1. Model Catalog

### Model A: Water-Quality Multi-Tier Anomaly Detector
- **Location:** `ai/models/anomaly_detector.py`
- **Methodology:** Three-tier analytical hierarchy:
  1. *Physical Hard Bounds:* Identifies impossible readings (e.g., negative pH, DO > 25 mg/L) caused by probe detachment or ADC hardware failure.
  2. *Rate-of-Change Velocity:* Flags non-biological step changes (e.g., DO dropping > 2.5 mg/L within a single 5-minute sampling interval).
  3. *Frozen Telemetry Detection:* Flags repeated static values across 5 consecutive samples indicating sensor bus lockup.
- **Outputs:** Anomaly flag, parameter, severity (`NORMAL`, `WARNING`, `CRITICAL`), and root-cause explanation.

### Model B: Biomass & Environmental Nutrition Engine
- **Location:** `backend/app/core/feeding_engine.py` & `ai/models/feeding_model.py`
- **Methodology:** Physiological metabolic intake curve for *Litopenaeus vannamei* across Days of Culture (DOC 1–120) with dynamic environmental safety gates:
  - DO < 3.2 mg/L: 100% feed cutoff (prevents fatal organic bottom hypoxia).
  - DO 3.2 – 4.0 mg/L: 60% feed reduction.
  - Ammonia > 0.12 mg/L: 50% feed reduction.
  - Temperature < 26°C or > 33°C: 25% feed reduction (slowed digestive motility).
- **Safety Interlock:** Daily feed cap prevents overfeeding even if requested by an operator.

### Model C: Explainable Multi-Pathogen Disease Risk Model
- **Location:** `ai/models/disease_model.py`
- **Pathogens Monitored:**
  - **WSSV (White Spot Syndrome Virus):** Cold water temperature (< 27°C) + thermal fluctuation (> 3°C swing) + low DO (< 4.0 mg/L).
  - **Vibriosis (V. harveyi / parahaemolyticus):** Elevated water temperature (> 31.5°C) + excess unionized ammonia (> 0.06 mg/L) + poor circulation.
  - **EMS / AHPND:** Severe feed intake drop + organic nitrogen accumulation + high heat.
- **Explainability:** Transparent additive stressor breakdown showing exactly which environmental factors contributed points to the cumulative risk score.
- **Clinical Disclaimer:** Telemetry risk scores represent environmental vulnerability ONLY. Laboratory PCR screening and veterinary pathology inspection are mandatory before administering clinical treatments.

### Model D: Computer Vision Check-Tray Inspection
- **Location:** `backend/app/core/cv_analyzer.py`
- **Methodology:** OpenCV image processing on feeding check-tray photographs to evaluate:
  - Prawn activity vigor and density.
  - Uneaten feed pellet clearance percentage.
  - Identification of lethargic or dead shrimp requiring human inspection.

---

## 2. Model Cards & Data Provenance

```
Model Identifier: AQUAINTEL-DIS-V2.1-EXPLAINABLE
Target Organism: Litopenaeus vannamei (Pacific White Shrimp)
Validation Status: DEMO / SYNTHETIC DATA BASELINE
Known Limitations: Environmental telemetry cannot identify microscopic pathogens directly.
                    Scores predict physiological stress conditions favorable for disease proliferation.
```
