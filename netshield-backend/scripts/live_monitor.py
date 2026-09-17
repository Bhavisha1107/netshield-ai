"""
NetShield AI - Continuous Live Traffic Simulator

Generates mixed Normal + Attack traffic continuously
from the UNSW-NB15 training dataset.

Usage:
python scripts/live_monitor.py
"""

import time
import random
import json
from pathlib import Path
from datetime import datetime, timezone

import joblib
import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv
import os


# ============================================================
# PROJECT PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[1]

DATA_PATH = BASE_DIR / "data" / "UNSW_NB15_training-set.csv"

AI_DIR = BASE_DIR / "app" / "ai"

MODEL_PATH = AI_DIR / "model.pkl"
SCALER_PATH = AI_DIR / "scaler.pkl"
ENCODERS_PATH = AI_DIR / "encoders.pkl"
METRICS_PATH = AI_DIR / "metrics.json"


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()

MONGO_URL = os.getenv(
    "MONGO_URL",
    "mongodb://localhost:27017"
)

MONGO_DB_NAME = os.getenv(
    "MONGO_DB_NAME",
    "netshield"
)


# ============================================================
# LOAD AI COMPONENTS
# ============================================================

print("Loading AI model...")

model = joblib.load(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)
encoders = joblib.load(ENCODERS_PATH)

try:
    with open(METRICS_PATH) as f:
        CURRENT_MODEL_ACCURACY = json.load(f).get("accuracy", 0.0)
except (FileNotFoundError, json.JSONDecodeError):
    CURRENT_MODEL_ACCURACY = 0.0

print("AI model loaded successfully.")
print(f"Model expects: {model.n_features_in_} features")


# ============================================================
# CATEGORICAL FEATURES
# ============================================================

CATEGORICAL_COLUMNS = [
    "proto",
    "service",
    "state",
]


# ============================================================
# FEATURE PREPARATION
# ============================================================

def prepare_features(row):

    df = pd.DataFrame([row])

    for col in CATEGORICAL_COLUMNS:

        encoder = encoders[col]

        value = str(df.iloc[0][col])

        if value not in encoder.classes_:
            value = encoder.classes_[0]

        df[col] = encoder.transform([value])

    X = df.drop(
        ["id", "label", "attack_cat"],
        axis=1,
        errors="ignore"
    )

    X = X.astype(float)

    return scaler.transform(X)


# ============================================================
# AI PREDICTION + DYNAMIC RISK
# ============================================================

def predict_traffic(row):

    try:

        X = prepare_features(row)

        prediction = int(model.predict(X)[0])

        probability = model.predict_proba(X)[0]

        confidence = round(
            float(max(probability)) * 100,
            2
        )

        # --------------------------------------------
        # Dynamic risk score
        # --------------------------------------------

        if prediction == 0:

            risk_score = round(
                100 - confidence,
                2
            )

        else:

            risk_score = round(
                confidence,
                2
            )

        # --------------------------------------------
        # Dynamic severity
        # --------------------------------------------

        if risk_score >= 90:

            severity = "Critical"

        elif risk_score >= 70:

            severity = "High"

        elif risk_score >= 40:

            severity = "Medium"

        else:

            severity = "Low"


        # --------------------------------------------
        # Result
        # --------------------------------------------

        if prediction == 0:

            return {
                "prediction": "Normal",
                "confidence": confidence,
                "model_accuracy": CURRENT_MODEL_ACCURACY,
                "risk_score": risk_score,
                "severity": severity,
                "report": {
                    "status": "Safe",
                    "recommendation":
                        "No action required."
                }
            }

        else:

            return {
                "prediction": "Attack",
                "confidence": confidence,
                "model_accuracy": CURRENT_MODEL_ACCURACY,
                "risk_score": risk_score,
                "severity": severity,
                "report": {
                    "status": "Threat Detected",
                    "recommendation":
                        "Block source IP and investigate the traffic."
                }
            }

    except Exception as e:

        print("Prediction error:", e)

        return {
            "prediction": "Unknown",
            "confidence": 0,
            "model_accuracy": CURRENT_MODEL_ACCURACY,
            "risk_score": 0,
            "severity": "Low",
            "report": {
                "status": "Prediction failed",
                "recommendation":
                    "Check preprocessing and model input."
            }
        }


# ============================================================
# CREATE MONGODB DOCUMENT
# ============================================================

def create_document(row, index):

    ai_result = predict_traffic(row)

    return {

        "timestamp":
            datetime.now(timezone.utc),

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

        "label":
            "BENIGN"
            if int(row.get("label", 0)) == 0
            else "ATTACK",

        "prediction":
            ai_result["prediction"],

        "confidence":
            ai_result["confidence"],

        "model_accuracy":
            ai_result["model_accuracy"],

        "risk_score":
            ai_result["risk_score"],

        "severity":
            ai_result["severity"],

        "report":
            ai_result["report"],
    }


# ============================================================
# MAIN LIVE MONITOR
# ============================================================

def main():

    print()
    print("==============================================")
    print("       NETSHIELD AI LIVE MONITOR")
    print("==============================================")
    print()

    print(f"Dataset: {DATA_PATH}")

    # --------------------------------------------
    # Load dataset
    # --------------------------------------------

    df = pd.read_csv(DATA_PATH)

    print(f"Total dataset rows: {len(df)}")

    normal_df = df[df["label"] == 0].copy()

    attack_df = df[df["label"] == 1].copy()

    print(f"Normal records: {len(normal_df)}")
    print(f"Attack records: {len(attack_df)}")

    # --------------------------------------------
    # MongoDB
    # --------------------------------------------

    client = MongoClient(MONGO_URL)

    collection = client[
        MONGO_DB_NAME
    ]["traffic_logs"]

    print()
    print("MongoDB connected.")
    print()
    print("LIVE TRAFFIC STARTED")
    print("Press CTRL+C to stop.")
    print()

    counter = 0

    try:

        while True:

            # ----------------------------------------
            # Randomly select traffic type
            # ----------------------------------------

            if random.random() < 0.5:

                row = normal_df.sample(
                    n=1
                ).iloc[0]

                traffic_type = "NORMAL"

            else:

                row = attack_df.sample(
                    n=1
                ).iloc[0]

                traffic_type = "ATTACK"


            # ----------------------------------------
            # Create AI prediction
            # ----------------------------------------

            document = create_document(
                row,
                counter
            )


            # ----------------------------------------
            # Insert into MongoDB
            # ----------------------------------------

            collection.insert_one(document)

            counter += 1


            # ----------------------------------------
            # Console output
            # ----------------------------------------

            print(
                f"[{counter}] "
                f"{traffic_type:6} | "
                f"{document['protocol']:5} | "
                f"{document['prediction']:7} | "
                f"Confidence: "
                f"{document['confidence']:5.1f}% | "
                f"Risk: "
                f"{document['risk_score']:5.1f} | "
                f"Severity: "
                f"{document['severity']}"
            )


            # ----------------------------------------
            # Wait before next traffic event
            # ----------------------------------------

            time.sleep(2)


    except KeyboardInterrupt:

        print()
        print("Live monitoring stopped.")
        print(f"Total records generated: {counter}")


# ============================================================
# START
# ============================================================

if __name__ == "__main__":

    main()