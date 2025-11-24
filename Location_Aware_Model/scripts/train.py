import pandas as pd
from src.data_loader import load_dataset
from src.features import add_features
from src.model import train_model

print("Loading dataset...")
df = load_dataset()
df = add_features(df)

X = df[["latitude", "longitude", "roof_area", "efficiency", 
        "tilt", "direction","orientation_score", "solar_irradiance"]]
y = df["actual_generation_kwh"]

print("Training model...")
train_model(X, y)
print("Model saved to models/xgb_model.pkl")
