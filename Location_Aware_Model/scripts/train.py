from src.data_loader import load_dataset
from src.features import add_features
from src.anomaly import remove_anomalies
from src.model import train_model

df = load_dataset()
df = add_features(df)
df = remove_anomalies(df)

X = df[
    ["latitude","longitude","roof_area","efficiency",
     "tilt","direction","orientation_score","solar_irradiance"]
]
y = df["actual_generation_kwh"]

train_model(X, y)
print("✅ Hybrid model trained")
