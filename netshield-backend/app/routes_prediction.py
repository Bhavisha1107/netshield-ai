from fastapi import APIRouter, Depends
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

import joblib
import json
from pathlib import Path
from datetime import datetime, timezone
from app.database import get_db, traffic_collection
from app import models


router = APIRouter(
    prefix="/prediction",
    tags=["Prediction"]
)


BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = BASE_DIR / "ai" / "model.pkl"
SCALER_PATH = BASE_DIR / "ai" / "scaler.pkl"
METRICS_PATH = BASE_DIR / "ai" / "metrics.json"


print("Model path:", MODEL_PATH)
print("Scaler path:", SCALER_PATH)


model = joblib.load(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)
print("======================================")
print("MODEL FEATURES:", getattr(model, "n_features_in_", "Not available"))
print("SCALER FEATURES:", scaler.n_features_in_)
print("FEATURE NAMES:", getattr(scaler, "feature_names_in_", "Not available"))
print("======================================")

def _load_current_accuracy(default: float = 0.0) -> float:
    """Read the model's real accuracy from metrics.json (written by
    train_model.py on every retrain) so the API never shows a stale
    hardcoded number after retraining."""
    try:
        with open(METRICS_PATH) as f:
            return json.load(f).get("accuracy", default)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


CURRENT_MODEL_ACCURACY = _load_current_accuracy()


@router.get("/metrics")
def get_model_metrics():
    """
    Real, current evaluation metrics for the deployed model — written by
    app/ai/train_model.py on every retrain, so this always reflects the
    model that's actually running (never a stale/hand-edited number).
    """
    if not METRICS_PATH.exists():
        return {"available": False, "message": "No metrics.json found — run app/ai/train_model.py first."}
    with open(METRICS_PATH) as f:
        metrics = json.load(f)
    return {"available": True, **metrics}


class PredictionInput(BaseModel):

    features: list[float]

    source_ip: str | None = None
    dest_ip: str | None = None
    protocol: str | None = None

    @field_validator("features")
    @classmethod
    def validate_features(cls, value):
        if len(value) != 42:
            raise ValueError(
                f"Exactly 42 features are required, but {len(value)} were provided."
            )
        return value


def calculate_severity(risk_score):

    if risk_score >= 75:
        return "Critical"

    if risk_score >= 50:
        return "High"

    if risk_score >= 25:
        return "Medium"

    return "Low"
def save_traffic_log(
    data,
    prediction,
    confidence,
    attack_probability,
    risk_score,
    severity,
    model_accuracy=0.0
):

    traffic_log = {
        "source_ip": data.source_ip,
        "dest_ip": data.dest_ip,
        "protocol": data.protocol,

        "attack_category": "AI Predicted",

        "prediction": prediction,

        "confidence": confidence,

        "model_accuracy": model_accuracy,

        "attack_probability": round(
            attack_probability * 100,
            2
        ),

        "risk_score": risk_score,

        "severity": severity,

        "timestamp": datetime.now(
            timezone.utc
        )
    }

    traffic_collection.insert_one(
        traffic_log
    )


def create_attack_notifications(db: Session, alert: models.Alert):
    users = db.query(models.User).filter(
        models.User.role.in_(["admin", "analyst"])
    ).all()
    for user in users:
        db.add(models.Notification(
            user_id=user.id,
            alert_id=alert.id,
            title=f"{alert.risk_level} threat detected",
            message=alert.message or "A suspicious network attack was detected.",
            severity=alert.risk_level or "High",
        ))

@router.post("/predict")
def predict(
    data: PredictionInput,
    db: Session = Depends(get_db)
):

    # ---------------------------------------------------------
    # 1. PREPROCESS INPUT
    # ---------------------------------------------------------

    x = scaler.transform([
        data.features
    ])

    # ---------------------------------------------------------
    # 2. AI PREDICTION
    # ---------------------------------------------------------

    prediction = int(
        model.predict(x)[0]
    )

    probabilities = model.predict_proba(x)[0]

    attack_class_index = list(
        model.classes_
    ).index(1)

    attack_probability = float(
        probabilities[attack_class_index]
    )

    risk_score = round(
        attack_probability * 100,
        2
    )

    confidence = round(
        float(max(probabilities)) * 100,
        2
    )

    severity = calculate_severity(
        risk_score
    )

    model_accuracy = CURRENT_MODEL_ACCURACY


    # ---------------------------------------------------------
    # 3. NORMAL TRAFFIC
    # ---------------------------------------------------------

    if prediction == 0:
        save_traffic_log(
    data=data,
    prediction="Normal",
    confidence=confidence,
    attack_probability=attack_probability,
    risk_score=risk_score,
    severity=severity,
    model_accuracy=model_accuracy
)

        return {

            "prediction": "Normal",

            "confidence": confidence,

            "model_accuracy":
                model_accuracy,

            "attack_probability":
                round(
                    attack_probability * 100,
                    2
                ),

            "risk_score":
                risk_score,

            "severity":
                severity,

            "alert_created":
                False,

            "report": {

                "status": "Safe",

                "recommendation":
                    "No action required."
            }
        }


    # ---------------------------------------------------------
    # 4. ATTACK DETECTED
    # ---------------------------------------------------------

    message = (
        f"AI detected an attack with "
        f"{severity} severity and "
        f"risk score {risk_score}%."
    )
    save_traffic_log(
    data=data,
    prediction="Attack",
    confidence=confidence,
    attack_probability=attack_probability,
    risk_score=risk_score,
    severity=severity,
    model_accuracy=model_accuracy
)


    # ---------------------------------------------------------
    # 5. CREATE POSTGRES ALERT
    # ---------------------------------------------------------

    new_alert = models.Alert(

        source_ip=data.source_ip,

        dest_ip=data.dest_ip,

        protocol=data.protocol,

        prediction="Attack",

        risk_score=risk_score,

        anomaly_score=attack_probability,

        risk_level=severity,

        status="open",

        message=message
    )

    db.add(new_alert)

    db.commit()

    db.refresh(new_alert)
    create_attack_notifications(db, new_alert)
    db.commit()


    # ---------------------------------------------------------
    # 6. RETURN AI RESULT + ALERT
    # ---------------------------------------------------------

    return {

        "prediction": "Attack",

        "confidence": confidence,

        "model_accuracy":
            model_accuracy,

        "attack_probability":
            round(
                attack_probability * 100,
                2
            ),

        "risk_score":
            risk_score,

        "severity":
            severity,

        "alert_created":
            True,

        "alert_id":
            new_alert.id,

        "report": {

            "status":
                "Threat Detected",

            "recommendation":
                "Block source IP and investigate the traffic."
        }
    }