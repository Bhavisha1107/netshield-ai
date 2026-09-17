"""
Batch UNSW-NB15 traffic ingestion + AI prediction.

This is the "seed the database" script — run it once (or with a larger
--max-rows) to populate MongoDB with a batch of AI-scored traffic records.
For a continuous, always-on live feed instead, use scripts/live_monitor.py.

Usage:
    python scripts/ingest_traffic.py --file data/UNSW_NB15_training-set.csv --batch-size 200 --delay 0.5 --max-rows 3000
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
from dotenv import load_dotenv
from pymongo import MongoClient

# ============================================================
# PROJECT PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[1]
AI_DIR = BASE_DIR / "app" / "ai"

# Make the app/ai preprocessing helpers importable from this script
sys.path.insert(0, str(AI_DIR))
from preprocess import build_feature_vector  # noqa: E402

MODEL_PATH = AI_DIR / "model.pkl"
SCALER_PATH = AI_DIR / "scaler.pkl"
ENCODERS_PATH = AI_DIR / "encoders.pkl"
FEATURE_COLUMNS_PATH = AI_DIR / "feature_columns.pkl"
METRICS_PATH = AI_DIR / "metrics.json"

# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "netshield")

# ============================================================
# LOAD AI COMPONENTS
# ============================================================

print(f"Model:    {MODEL_PATH}")
print(f"Scaler:   {SCALER_PATH}")
print(f"Encoders: {ENCODERS_PATH}")

model = joblib.load(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)
encoders = joblib.load(ENCODERS_PATH)
feature_columns = joblib.load(FEATURE_COLUMNS_PATH)

try:
    with open(METRICS_PATH) as f:
        CURRENT_MODEL_ACCURACY = json.load(f).get("accuracy", 0.0)
except (FileNotFoundError, json.JSONDecodeError):
    CURRENT_MODEL_ACCURACY = 0.0

print("AI model loaded successfully.")
print(f"Model expects: {model.n_features_in_} features ({len(feature_columns)} columns loaded)")
print(f"Current model accuracy (from metrics.json): {CURRENT_MODEL_ACCURACY}%")


# ============================================================
# AI PREDICTION
# ============================================================

def calculate_severity(risk_score: float) -> str:
    if risk_score >= 90:
        return "Critical"
    if risk_score >= 70:
        return "High"
    if risk_score >= 40:
        return "Medium"
    return "Low"


def predict_traffic(row) -> dict:
    """Run the trained model on one UNSW-NB15 row and return AI results."""
    try:
        raw_features = build_feature_vector(row, encoders, feature_columns)
        X = scaler.transform([raw_features])

        prediction = int(model.predict(X)[0])
        probabilities = model.predict_proba(X)[0]
        confidence = round(float(max(probabilities)) * 100, 2)

        # Dynamic risk score: for attacks, higher confidence = higher risk;
        # for normal traffic, higher confidence = lower risk.
        risk_score = round(confidence, 2) if prediction == 1 else round(100 - confidence, 2)
        severity = calculate_severity(risk_score)

        if prediction == 0:
            return {
                "prediction": "Normal",
                "confidence": confidence,
                "model_accuracy": CURRENT_MODEL_ACCURACY,
                "risk_score": risk_score,
                "severity": severity,
                "report": {"status": "Safe", "recommendation": "No action required."},
            }

        return {
            "prediction": "Attack",
            "confidence": confidence,
            "model_accuracy": CURRENT_MODEL_ACCURACY,
            "risk_score": risk_score,
            "severity": severity,
            "report": {
                "status": "Threat Detected",
                "recommendation": "Block source IP and investigate the traffic.",
            },
        }

    except Exception as e:
        print(f"Prediction failed: {e}")
        return {
            "prediction": "Unknown",
            "confidence": 0,
            "model_accuracy": CURRENT_MODEL_ACCURACY,
            "risk_score": 0,
            "severity": "Low",
            "report": {
                "status": "Prediction failed",
                "recommendation": "Check preprocessing and model input.",
            },
        }


# ============================================================
# MAP CSV ROW TO MONGODB DOCUMENT
# ============================================================

def map_row_to_traffic_doc(row, index: int) -> dict:
    ai_result = predict_traffic(row)
    raw_features = build_feature_vector(row, encoders, feature_columns)

    return {
        "timestamp": datetime.now(timezone.utc),

        # Display fields (synthetic IPs — this dataset variant has no raw IPs)
        "src_ip": f"10.0.{(index // 254) % 254}.{index % 254}",
        "dst_ip": f"192.168.{(index // 254) % 254}.{index % 254}",
        "protocol": str(row.get("proto", "unknown")).upper(),
        "service": str(row.get("service", "-")),
        "state": str(row.get("state", "-")),
        "packet_size": float(row.get("sbytes", 0) or 0) + float(row.get("dbytes", 0) or 0),
        "duration": float(row.get("dur", 0) or 0),
        "features": raw_features,
        "attack_category": str(row.get("attack_cat", "Normal")),

        # Ground-truth label from the dataset (for comparison against the AI prediction)
        "label": "BENIGN" if int(row.get("label", 0)) == 0 else "ATTACK",

        # AI prediction results
        "prediction": ai_result["prediction"],
        "confidence": ai_result["confidence"],
        "model_accuracy": ai_result["model_accuracy"],
        "risk_score": ai_result["risk_score"],
        "severity": ai_result["severity"],
        "report": ai_result["report"],
    }


# ============================================================
# MAIN INGESTION
# ============================================================

def main(file_path: str, batch_size: int, delay: float, max_rows: int, clear: bool):
    client = MongoClient(MONGO_URL)
    collection = client[MONGO_DB_NAME]["traffic_logs"]

    if clear:
        deleted = collection.delete_many({}).deleted_count
        print(f"Cleared {deleted} existing traffic_logs documents.")

    print(f"Reading {file_path} ...")
    df = pd.read_csv(file_path)
    if max_rows:
        df = df.head(max_rows)
    print(f"Loaded {len(df)} rows. Ingesting in batches of {batch_size}...")

    batch = []
    inserted = 0

    for idx, row in df.iterrows():
        document = map_row_to_traffic_doc(row, idx)
        batch.append(document)

        if len(batch) >= batch_size:
            collection.insert_many(batch)
            inserted += len(batch)
            print(f"Inserted {inserted} records...")
            for doc in batch[-3:]:
                print(
                    f"  {doc['protocol']:6} -> {doc['prediction']:7} | "
                    f"Confidence: {doc['confidence']:5.1f}% | "
                    f"Risk: {doc['risk_score']:5.1f} | Severity: {doc['severity']}"
                )
            batch = []
            time.sleep(delay)

    if batch:
        collection.insert_many(batch)
        inserted += len(batch)
        print(f"Inserted {inserted} records...")

    print(f"Done. Total inserted: {inserted}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True, help="Path to UNSW-NB15 CSV")
    parser.add_argument("--batch-size", type=int, default=200)
    parser.add_argument("--delay", type=float, default=0.5, help="Seconds between batches")
    parser.add_argument("--max-rows", type=int, default=3000, help="Cap rows for testing")
    parser.add_argument("--clear", action="store_true", help="Delete existing traffic_logs documents before ingesting (recommended after a model/schema change)")
    args = parser.parse_args()

    main(args.file, args.batch_size, args.delay, args.max_rows, args.clear)
