import joblib
from pathlib import Path


AI_DIR = Path(__file__).resolve().parents[1] / "app" / "ai"


def test_model_artifacts_match_prediction_contract():
    model = joblib.load(AI_DIR / "model.pkl")
    scaler = joblib.load(AI_DIR / "scaler.pkl")

    assert model.n_features_in_ == 42
    assert scaler.n_features_in_ == 42
