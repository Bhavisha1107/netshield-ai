import joblib
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

model = joblib.load(BASE_DIR / "model.pkl")
scaler = joblib.load(BASE_DIR / "scaler.pkl")


def calculate_severity(risk_score):
    """
    Convert risk score into severity level.
    """

    if risk_score >= 75:
        return "Critical"

    if risk_score >= 50:
        return "High"

    if risk_score >= 25:
        return "Medium"

    return "Low"


def predict_attack(features):
    """
    Predict whether network traffic is normal or an attack.
    Risk score represents the probability of an attack.
    """

    features = scaler.transform([features])

    prediction = int(model.predict(features)[0])

    probabilities = model.predict_proba(features)[0]

    # Find probability belonging to attack class (1)
    attack_class_index = list(model.classes_).index(1)

    attack_probability = float(
        probabilities[attack_class_index]
    )

    # Convert attack probability to 0-100 risk score
    risk_score = round(attack_probability * 100, 2)

    confidence = round(
        float(max(probabilities)) * 100,
        2
    )

    severity = calculate_severity(risk_score)

    if prediction == 0:

        return {
            "prediction": "Normal",
            "confidence": confidence,
            "risk_score": risk_score,
            "severity": severity
        }

    return {
        "prediction": "Attack",
        "confidence": confidence,
        "risk_score": risk_score,
        "severity": severity
    }