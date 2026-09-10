import pandas as pd
import joblib
from pathlib import Path
from sklearn.preprocessing import LabelEncoder, StandardScaler

AI_DIR = Path(__file__).resolve().parent

CATEGORICAL_COLUMNS = ["proto", "service", "state"]

# Columns that must NEVER be used as model features:
# - "id" is just the row number in the CSV. Including it leaks the
#   dataset's row ordering (attacks/normal rows are grouped in blocks
#   in the raw file) straight into the model, which is why an earlier
#   version of this pipeline reported a suspicious 99.9% accuracy.
# - "label" / "attack_cat" are the prediction targets, not inputs.
DROP_COLUMNS = ["id", "label", "attack_cat"]


def load_dataset(path):
    df = pd.read_csv(path)

    # Remove rows with missing values
    df = df.dropna()

    encoders = {}

    # Encode categorical columns
    for col in CATEGORICAL_COLUMNS:
        encoder = LabelEncoder()
        df[col] = encoder.fit_transform(df[col].astype(str))
        encoders[col] = encoder

    # Features (drop id/label/attack_cat — see DROP_COLUMNS above)
    X = df.drop(columns=[c for c in DROP_COLUMNS if c in df.columns])

    # Save the exact feature column order used for training so that
    # prediction/scoring scripts can build vectors that match exactly.
    feature_columns = list(X.columns)

    # Target
    y = df["label"]

    # Scale features
    scaler = StandardScaler()
    X = scaler.fit_transform(X)

    # Save preprocessing objects (relative to this file, not the CWD,
    # so this works regardless of where the training script is run from)
    joblib.dump(scaler, AI_DIR / "scaler.pkl")
    joblib.dump(encoders, AI_DIR / "encoders.pkl")
    joblib.dump(feature_columns, AI_DIR / "feature_columns.pkl")

    return X, y


def build_feature_vector(row: dict, encoders: dict, feature_columns: list) -> list:
    """
    Convert one raw UNSW-NB15 row (dict-like, e.g. a pandas Series or
    a JSON payload) into a feature vector in the exact column order
    the model was trained on. Used by both the live /prediction/predict
    endpoint and batch scoring scripts, so there is only ONE place that
    defines "what a feature vector looks like".
    """
    values = []
    for col in feature_columns:
        if col in CATEGORICAL_COLUMNS:
            encoder = encoders[col]
            value = str(row.get(col, ""))
            if value not in encoder.classes_:
                # Unseen category at inference time — fall back to the
                # first known class rather than crashing.
                value = encoder.classes_[0]
            values.append(float(encoder.transform([value])[0]))
        else:
            values.append(float(row.get(col, 0) or 0))
    return values
