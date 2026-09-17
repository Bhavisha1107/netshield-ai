"""
Real-time simulated traffic ingestion with AI prediction.
"""

import argparse
import json
import time
from datetime import datetime, timezone
from pathlib import Path
import os

import pandas as pd
import joblib
from pymongo import MongoClient
from dotenv import load_dotenv


# --------------------------------------------------
# ENVIRONMENT
# --------------------------------------------------

load_dotenv()

MONGO_URL = os.getenv(
    "MONGO_URL",
    "mongodb://localhost:27017"
)

MONGO_DB_NAME = os.getenv(
    "MONGO_DB_NAME",
    "netshield"
)


# --------------------------------------------------
# PROJECT PATHS
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parents[1]

MODEL_PATH = BASE_DIR / "app" / "ai" / "model.pkl"
SCALER_PATH = BASE_DIR / "app" / "ai" / "scaler.pkl"
ENCODERS_PATH = BASE_DIR / "app" / "ai" / "encoders.pkl"
METRICS_PATH = BASE_DIR / "app" / "ai" / "metrics.json"


print("Model:", MODEL_PATH)
print("Scaler:", SCALER_PATH)
print("Encoders:", ENCODERS_PATH)


# --------------------------------------------------
# LOAD AI MODEL
# --------------------------------------------------

model = joblib.load(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)
encoders = joblib.load(ENCODERS_PATH)

try:
    with open(METRICS_PATH) as f:
        CURRENT_MODEL_ACCURACY = json.load(f).get("accuracy", 0.0)
except (FileNotFoundError, json.JSONDecodeError):
    CURRENT_MODEL_ACCURACY = 0.0

print("AI model loaded successfully.")
print("Model expects:", model.n_features_in_, "features")


# --------------------------------------------------
# CREATE AI FEATURES
# --------------------------------------------------
def prepare_features(row):
    """
    Convert one UNSW-NB15 row into the same
    43-feature format used during training.
    """

    data = row.copy()

    # Encode categorical columns
    categorical = ["proto", "service", "state"]

    for col in categorical:
        encoder = encoders[col]

        value = str(data[col])

        if value not in encoder.classes_:
            value = encoder.classes_[0]

        data[col] = encoder.transform([value])[0]

    # Remove target columns (and the leaky row-index "id" column)
    X = data.drop(["id", "label", "attack_cat"], errors="ignore")

    # Convert all features to numeric
    X = pd.to_numeric(X)

    # Convert Series to 2D DataFrame
    X = X.to_frame().T

    # Apply the same scaler used during training
    X_scaled = scaler.transform(X)

    return X_scaled


# --------------------------------------------------
# MAP TRAFFIC + AI PREDICTION
# --------------------------------------------------

def map_row_to_traffic_doc(row, index: int) -> dict:

    # Prepare 43 ML features
    features = prepare_features(row)

    # AI prediction
    prediction = int(
        model.predict(features)[0]
    )

    # Prediction probability
    probabilities = model.predict_proba(features)[0]

    confidence = round(
        float(max(probabilities)) * 100,
        2
    )

    # --------------------------------------------------
    # AI RESULT
    # --------------------------------------------------

    if prediction == 0:

        prediction_name = "Normal"
        risk_score = 10
        severity = "Low"

    else:

        prediction_name = "Attack"
        risk_score = 90
        severity = "High"

    # --------------------------------------------------
    # TRAFFIC DOCUMENT
    # --------------------------------------------------

    return {

        "timestamp": datetime.now(timezone.utc),

        "src_ip":
            f"10.0.{(index // 254) % 254}.{index % 254}",

        "dst_ip":
            f"192.168.{(index // 254) % 254}.{index % 254}",

        "protocol":
            str(row.get("proto", "unknown")).upper(),

        "service":
            str(row.get("service", "-")),

        "state":
            str(row.get("state", "-")),

        "packet_size":
            float(row.get("sbytes", 0) or 0)
            +
            float(row.get("dbytes", 0) or 0),

        "duration":
            float(row.get("dur", 0) or 0),

        "attack_category":
            str(row.get("attack_cat", "Normal")),

        # Original dataset label
        "label":
            "BENIGN"
            if int(row.get("label", 0)) == 0
            else "ATTACK",

        # --------------------------------------------------
        # AI FIELDS
        # --------------------------------------------------

        "prediction":
            prediction_name,

        "confidence":
            confidence,

        "model_accuracy":
            CURRENT_MODEL_ACCURACY,

        "risk_score":
            risk_score,

        "severity":
            severity,
    }


# --------------------------------------------------
# MAIN INGESTION
# --------------------------------------------------

def main(
    file_path: str,
    batch_size: int,
    delay: float,
    max_rows: int
):

    client = MongoClient(MONGO_URL)

    collection = client[
        MONGO_DB_NAME
    ]["traffic_logs"]

    print(
        f"Reading {file_path} ..."
    )

    df = pd.read_csv(file_path)

    if max_rows:
        df = df.head(max_rows)

    print(
        f"Loaded {len(df)} rows."
    )

    print(
        f"Ingesting in batches of {batch_size}..."
    )

    batch = []

    inserted = 0

    for idx, row in df.iterrows():

        try:

            document = map_row_to_traffic_doc(
                row,
                idx
            )

            batch.append(document)

        except Exception as e:

            print(
                f"Prediction failed for row {idx}: {e}"
            )

            continue

        if len(batch) >= batch_size:

            collection.insert_many(batch)

            inserted += len(batch)

            print(
                f"Inserted {inserted} records..."
            )

            batch = []

            # Simulate real-time traffic
            time.sleep(delay)

    # Insert remaining records

    if batch:

        collection.insert_many(batch)

        inserted += len(batch)

    print(
        f"Done. Total inserted: {inserted}"
    )


# --------------------------------------------------
# COMMAND LINE
# --------------------------------------------------

if __name__ == "__main__":

    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--file",
        required=True,
        help="Path to UNSW-NB15 CSV"
    )

    parser.add_argument(
        "--batch-size",
        type=int,
        default=10
    )

    parser.add_argument(
        "--delay",
        type=float,
        default=2.0,
        help="Seconds between batches"
    )

    parser.add_argument(
        "--max-rows",
        type=int,
        default=100,
        help="Maximum rows for testing"
    )

    args = parser.parse_args()

    main(
        args.file,
        args.batch_size,
        args.delay,
        args.max_rows
    )