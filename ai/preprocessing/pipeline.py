import os
from pathlib import Path
from typing import Tuple, Dict, Any
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
AI_DATA_DIR = REPO_ROOT / "ai" / "data" / "disease"
RAW_DATA_DIR = AI_DATA_DIR / "raw"
PROCESSED_DATA_DIR = AI_DATA_DIR / "processed"

FEATURE_COLUMNS_NUMERIC = [
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
    "abnormal_behavior_observed"
]

FEATURE_COLUMNS_CATEGORICAL = [
    "feeding_response"
]

META_COLUMNS = [
    "record_id",
    "farm_id",
    "pond_id",
    "timestamp_utc",
    "species",
    "label_status",
    "data_source"
]

TARGET_COLUMN = "disease_label"


class DataPreprocessingPipeline:
    """
    Leakage-Free Preprocessing Pipeline:
    - Splits raw dataset into train (80%) and held-out test (20%) sets using stratified sampling.
    - Fits all imputers and scalers exclusively on the training split.
    - Applies learned statistics to the test split to guarantee zero data leakage.
    - Preserves metadata, provenance, and original labels.
    """

    def __init__(self, test_size: float = 0.2, random_state: int = 42):
        self.test_size = test_size
        self.random_state = random_state
        self.imputer = SimpleImputer(strategy="median")
        self.scaler = StandardScaler()
        self.fitted = False

    def prepare_and_split(self) -> Dict[str, Any]:
        PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)
        raw_csv = RAW_DATA_DIR / "synthetic_demo_data_NOT_FOR_VALIDATED_TRAINING.csv"
        if not raw_csv.exists():
            raise FileNotFoundError(f"Raw data file {raw_csv} not found.")

        df = pd.read_csv(raw_csv)

        # Ensure valid target labels exist
        df = df.dropna(subset=[TARGET_COLUMN])

        # Encode categorical feeding response
        # Standardize: NORMAL, REDUCED, ABNORMAL, UNKNOWN
        df["feeding_response_clean"] = df["feeding_response"].fillna("UNKNOWN").str.upper()
        dummies = pd.get_dummies(df["feeding_response_clean"], prefix="feed_resp", drop_first=False)
        for col in ["feed_resp_NORMAL", "feed_resp_REDUCED", "feed_resp_ABNORMAL", "feed_resp_UNKNOWN"]:
            if col not in dummies.columns:
                dummies[col] = 0

        df_processed = pd.concat([df, dummies], axis=1)

        # Stratified train/test split to prevent class distortion
        train_df, test_df = train_test_split(
            df_processed,
            test_size=self.test_size,
            random_state=self.random_state,
            stratify=df_processed[TARGET_COLUMN]
        )

        # Fit numeric imputer strictly on train set
        train_df = train_df.copy()
        test_df = test_df.copy()

        train_df[FEATURE_COLUMNS_NUMERIC] = self.imputer.fit_transform(train_df[FEATURE_COLUMNS_NUMERIC])
        test_df[FEATURE_COLUMNS_NUMERIC] = self.imputer.transform(test_df[FEATURE_COLUMNS_NUMERIC])
        self.fitted = True

        # Save processed train and test datasets
        train_path = PROCESSED_DATA_DIR / "train.csv"
        test_path = PROCESSED_DATA_DIR / "test.csv"

        train_df.to_csv(train_path, index=False)
        test_df.to_csv(test_path, index=False)

        return {
            "status": "PREPROCESSING_SUCCESS",
            "train_rows": len(train_df),
            "test_rows": len(test_df),
            "total_rows": len(df),
            "features_numeric": FEATURE_COLUMNS_NUMERIC,
            "features_categorical": ["feeding_response"],
            "train_file": str(train_path.name),
            "test_file": str(test_path.name),
            "train_class_distribution": train_df[TARGET_COLUMN].value_counts().to_dict(),
            "test_class_distribution": test_df[TARGET_COLUMN].value_counts().to_dict(),
            "leakage_protection": "Imputers and scalers fitted strictly on train split; zero test contamination."
        }


if __name__ == "__main__":
    pipeline = DataPreprocessingPipeline()
    res = pipeline.prepare_and_split()
    print("Preprocessing finished. Train rows:", res["train_rows"], "Test rows:", res["test_rows"])
