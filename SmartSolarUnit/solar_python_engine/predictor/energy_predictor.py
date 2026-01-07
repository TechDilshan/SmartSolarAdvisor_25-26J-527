import joblib
import pandas as pd
from pathlib import Path

MODEL_PATH = Path("model/solar_power_model.pkl")

model = joblib.load(MODEL_PATH)

FEATURES = [
    "irradiance",
    "temperature",
    "humidity",
    "rainfall",
    "dust_level"
]


def predict_5min_energy(features: dict) -> float:
    df = pd.DataFrame([{k: features[k] for k in FEATURES}])
    prediction = model.predict(df)[0]
    return float(prediction)
