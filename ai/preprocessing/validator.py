import os
import glob
import json
import zipfile
from pathlib import Path
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np

# Root directory of the repository
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
AI_DATA_DIR = REPO_ROOT / "ai" / "data" / "disease"
RAW_DATA_DIR = AI_DATA_DIR / "raw"
PROCESSED_DATA_DIR = AI_DATA_DIR / "processed"
REPORTS_DIR = AI_DATA_DIR / "reports"
ARTIFACTS_DIR = REPO_ROOT / "ai" / "artifacts"

EXPECTED_COLUMNS = [
    "record_id",
    "farm_id",
    "pond_id",
    "timestamp_utc",
    "species",
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
    "feeding_response",
    "mortality_count_24h",
    "abnormal_behavior_observed",
    "disease_label",
    "label_status",
    "data_source"
]

NUMERICAL_RANGES = {
    "temperature_c": (15.0, 42.0),
    "do_mg_l": (0.0, 25.0),
    "ph": (5.5, 10.5),
    "salinity_ppt": (0.0, 50.0),
    "tan_mg_l": (0.0, 10.0),
    "unionized_nh3_mg_l": (0.0, 2.0),
    "turbidity_ntu": (0.0, 200.0),
    "water_level_m": (0.2, 3.5),
    "culture_day": (1, 180),
    "mortality_count_24h": (0, 10000)
}

VALID_DISEASE_LABELS = {
    "HEALTHY",
    "WSSV",
    "VIBRIOSIS",
    "AHPND_EMS",
    "BLACK_GILL",
    "MIXED_OR_UNRESOLVED",
    "EHP",
    "YHV"
}

VALID_LABEL_STATUSES = {
    "CONFIRMED",
    "SUSPECTED",
    "RULED_OUT",
    "UNRESOLVED",
    "SYNTHETIC_LABEL"
}


class DatasetValidator:
    """
    Automated Data Validation and Quality Auditing Pipeline for AquaIntel
    - Locates and extracts manual ZIP archive if needed
    - Validates CSV schemas, physical ranges, duplicates, and missing values
    - Strictly distinguishes synthetic fixtures vs real farm records
    - Emits structured JSON and Markdown data-quality reports
    """

    @classmethod
    def discover_and_extract_zip(cls) -> Optional[Path]:
        """Scans project root and immediate subdirs for dataset ZIP."""
        zip_candidates = list(REPO_ROOT.glob("*.zip")) + list(REPO_ROOT.glob("*/*.zip"))
        dataset_zips = [z for z in zip_candidates if "aquaintel" in z.name.lower() or "dataset" in z.name.lower() or "disease" in z.name.lower()]
        
        target_zip = dataset_zips[0] if dataset_zips else (zip_candidates[0] if zip_candidates else None)
        if not target_zip:
            return None

        RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
        # Check if already extracted
        raw_csvs = list(RAW_DATA_DIR.glob("*.csv"))
        if not raw_csvs:
            with zipfile.ZipFile(target_zip, 'r') as zip_ref:
                for member in zip_ref.namelist():
                    filename = os.path.basename(member)
                    if not filename:
                        continue
                    source = zip_ref.open(member)
                    target = open(RAW_DATA_DIR / filename, "wb")
                    with source, target:
                        target.write(source.read())
        return target_zip

    @classmethod
    def validate_dataset(cls) -> Dict[str, Any]:
        """Performs comprehensive schema and quality validation."""
        REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        zip_path = cls.discover_and_extract_zip()

        raw_files = list(RAW_DATA_DIR.glob("*.csv"))
        file_inventory = [f.name for f in raw_files]

        # Prioritize synthetic demo data file or real farm observations
        target_file = None
        for f in raw_files:
            if "synthetic_demo_data" in f.name:
                target_file = f
                break
            elif "real_farm_data" in f.name and "template" not in f.name:
                target_file = f
                break

        if not target_file and (RAW_DATA_DIR / "real_farm_data_template.csv").exists():
            target_file = RAW_DATA_DIR / "real_farm_data_template.csv"

        if not target_file:
            return {
                "status": "NO_DATA_FOUND",
                "zip_detected": str(zip_path) if zip_path else None,
                "error": "No CSV data file found in ai/data/disease/raw/"
            }

        df = pd.read_csv(target_file)
        total_rows_loaded = len(df)

        if total_rows_loaded == 0:
            return {
                "status": "EMPTY_DATASET",
                "target_file": target_file.name,
                "total_rows_loaded": 0,
                "is_synthetic": False,
                "real_records": 0,
                "confirmed_labels": 0
            }

        # 1. Column Presence Check
        missing_columns = [col for col in EXPECTED_COLUMNS if col not in df.columns]

        # 2. Duplicate Check
        duplicate_record_ids = int(df["record_id"].duplicated().sum()) if "record_id" in df.columns else 0
        duplicate_rows = int(df.duplicated().sum())

        # 3. Missing Value Analysis
        missing_stats = {}
        for col in df.columns:
            null_count = int(df[col].isnull().sum())
            if null_count > 0:
                missing_stats[col] = {
                    "missing_count": null_count,
                    "missing_pct": round((null_count / total_rows_loaded) * 100, 2)
                }

        # 4. Out-of-Bounds & Invalid Value Analysis
        range_violations = {}
        for col, (min_val, max_val) in NUMERICAL_RANGES.items():
            if col in df.columns:
                series = pd.to_numeric(df[col], errors='coerce')
                violating = series[(series < min_val) | (series > max_val)]
                if len(violating) > 0:
                    range_violations[col] = {
                        "violating_count": int(len(violating)),
                        "allowed_range": [min_val, max_val],
                        "sample_violations": [float(x) for x in violating.head(3).tolist()]
                    }

        # 5. Synthetic vs Real vs Confirmed Label Audit
        data_source_counts = df["data_source"].value_counts().to_dict() if "data_source" in df.columns else {}
        label_status_counts = df["label_status"].value_counts().to_dict() if "label_status" in df.columns else {}
        
        synthetic_rows = int(df[df["label_status"] == "SYNTHETIC_LABEL"].shape[0]) if "label_status" in df.columns else 0
        real_rows = total_rows_loaded - synthetic_rows
        confirmed_labels = int(df[df["label_status"] == "CONFIRMED"].shape[0]) if "label_status" in df.columns else 0

        # Class Distribution
        class_distribution = df["disease_label"].value_counts().to_dict() if "disease_label" in df.columns else {}

        # Provenance Classification
        if synthetic_rows == total_rows_loaded:
            provenance_status = "100%_SYNTHETIC_DEMO_DATA"
            validation_status = "NOT_VALIDATED_FOR_REAL_WORLD_DISEASE_PREDICTION"
        elif confirmed_labels > 0:
            provenance_status = "CONTAINS_CONFIRMED_REAL_LABELS"
            validation_status = "PARTIALLY_VALIDATED"
        else:
            provenance_status = "UNCONFIRMED_OBSERVATIONS"
            validation_status = "UNVALIDATED_OBSERVATIONS"

        report = {
            "validation_timestamp": pd.Timestamp.now("UTC").isoformat(),
            "zip_archive_path": str(zip_path.name) if zip_path else None,
            "raw_file_inventory": file_inventory,
            "validated_file": target_file.name,
            "total_rows_loaded": total_rows_loaded,
            "total_columns": len(df.columns),
            "missing_columns": missing_columns,
            "duplicate_records": duplicate_record_ids,
            "duplicate_rows": duplicate_rows,
            "missing_values_by_column": missing_stats,
            "physical_range_violations": range_violations,
            "provenance": {
                "status": provenance_status,
                "validation_status": validation_status,
                "synthetic_rows": synthetic_rows,
                "real_rows": real_rows,
                "confirmed_clinical_labels": confirmed_labels,
                "data_source_breakdown": data_source_counts,
                "label_status_breakdown": label_status_counts
            },
            "class_distribution": class_distribution,
            "critical_disclaimer": "CRITICAL: The validated dataset contains synthetic demo data. Under Section 5 of the Master Specification, models trained on this data are experimental and CANNOT be used as validated evidence for commercial farm decisions."
        }

        # Save JSON Report
        report_json_path = REPORTS_DIR / "data_quality_report.json"
        with open(report_json_path, "w") as f:
            json.dump(report, f, indent=2)

        # Save Markdown Report
        report_md_path = REPORTS_DIR / "data_quality_report.md"
        cls._generate_markdown_report(report, report_md_path)

        return report

    @classmethod
    def _generate_markdown_report(cls, report: Dict[str, Any], output_path: Path):
        prov = report["provenance"]
        md = f"""# AquaIntel Data Quality & Validation Audit Report

**Generated:** `{report['validation_timestamp']}`  
**Dataset Source File:** `{report['validated_file']}`  
**Source ZIP Archive:** `{report['zip_archive_path']}`  
**Provenance Status:** `{prov['status']}`  
**Model Validation Classification:** `{prov['validation_status']}`

> [!WARNING]
> **SYNTHETIC DEMO DATA NOTICE:**  
> Total rows: {report['total_rows_loaded']} | Synthetic: {prov['synthetic_rows']} | Real farm observations: {prov['real_rows']} | Confirmed clinical labels: {prov['confirmed_clinical_labels']}  
> This dataset is designated for pipeline plumbing, frontend demonstration, and test suite verification only. It is **NOT VALIDATED** for actual veterinary or farm mortality intervention decisions.

---

## 1. Dataset Overview & Dimensions
- **Total Rows Evaluated:** {report['total_rows_loaded']}
- **Total Columns:** {report['total_columns']}
- **Duplicate Record IDs:** {report['duplicate_records']}
- **Missing Required Schema Columns:** {len(report['missing_columns'])}

## 2. Class Distribution (Prawn Disease Target)
| Target Class | Row Count | Percentage |
|---|---|---|
"""
        for cls_name, count in report["class_distribution"].items():
            pct = (count / report['total_rows_loaded']) * 100
            md += f"| `{cls_name}` | {count} | {pct:.1f}% |\n"

        md += "\n## 3. Data Quality & Missingness\n"
        if report["missing_values_by_column"]:
            md += "| Column | Missing Count | Missing % |\n|---|---|---|\n"
            for col, stats in report["missing_values_by_column"].items():
                md += f"| `{col}` | {stats['missing_count']} | {stats['missing_pct']}% |\n"
        else:
            md += "✅ No missing values detected across all columns.\n"

        md += "\n## 4. Range & Physical Bound Validation\n"
        if report["physical_range_violations"]:
            md += "| Parameter | Violations | Allowed Bounds | Sample Values |\n|---|---|---|---|\n"
            for col, v in report["physical_range_violations"].items():
                md += f"| `{col}` | {v['violating_count']} | {v['allowed_range']} | {v['sample_violations']} |\n"
        else:
            md += "✅ All sensor and physiological parameters fall within expected biological limits.\n"

        md += """
---
## 5. Regulatory & Clinical Mandate
Water-quality telemetry measures environmental vulnerability stressors (hypoxia, osmotic shock, toxic unionized ammonia). **It does not provide definitive pathogen confirmation.** Laboratory RT-qPCR assays and pathology inspection by certified aquatic animal health specialists are mandatory before administering clinical treatments.
"""
        with open(output_path, "w") as f:
            f.write(md)


if __name__ == "__main__":
    rep = DatasetValidator.validate_dataset()
    print("Validation Complete. Provenance:", rep.get("provenance", {}).get("status"))
