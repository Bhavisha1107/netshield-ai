import json
import joblib
from pathlib import Path

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
)
from sklearn.model_selection import train_test_split

from preprocess import load_dataset


# Project paths
AI_DIR = Path(__file__).resolve().parent
BASE_DIR = AI_DIR.parents[1]

DATASET_PATH = BASE_DIR / "data" / "UNSW_NB15_training-set.csv"

print("Dataset path:")
print(DATASET_PATH)


# Load dataset (id/label/attack_cat already excluded from features — see preprocess.py)
X, y = load_dataset(DATASET_PATH)


# Split dataset
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y,
)


# Create model
model = RandomForestClassifier(
    n_estimators=100,
    random_state=42,
)


# Train model
model.fit(X_train, y_train)


# Prediction
prediction = model.predict(X_test)


# Metrics
accuracy = accuracy_score(y_test, prediction)
precision = precision_score(y_test, prediction)
recall = recall_score(y_test, prediction)
f1 = f1_score(y_test, prediction)
cm = confusion_matrix(y_test, prediction)


print("\n========== MODEL RESULTS ==========")

print("Accuracy :", accuracy)
print("Precision:", precision)
print("Recall   :", recall)
print("F1 Score :", f1)

print("\nConfusion Matrix:")
print(cm)


# Save model
MODEL_PATH = AI_DIR / "model.pkl"
joblib.dump(model, MODEL_PATH)

print("\nModel saved successfully!")
print("Model path:", MODEL_PATH)


# Save metrics so the API/report/dashboard can display real, current numbers
# (previously metrics.json was static/hand-edited and could drift from the
# actual model — this keeps them in sync automatically on every retrain)
metrics = {
    "accuracy": round(accuracy * 100, 2),
    "precision": round(precision * 100, 2),
    "recall": round(recall * 100, 2),
    "f1_score": round(f1 * 100, 2),
    "confusion_matrix": cm.tolist(),
    "test_set_size": int(len(y_test)),
}

METRICS_PATH = AI_DIR / "metrics.json"
with open(METRICS_PATH, "w") as f:
    json.dump(metrics, f, indent=2)

print("Metrics saved to:", METRICS_PATH)
