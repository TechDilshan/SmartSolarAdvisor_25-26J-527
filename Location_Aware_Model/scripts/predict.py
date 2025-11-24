from src.model import load_model
import pandas as pd
import numpy as np
from src.features import add_features

model = load_model()

user = {
    "latitude": 6.9271,
    "longitude": 79.8612,
    "roof_area": 120,
    "efficiency": 18,
    "tilt": 20,
    "direction": 180,
    "solar_irradiance": 5.8
}

df = pd.DataFrame([user])
df = add_features(df)

X = df[["latitude", "longitude", "roof_area", "efficiency", 
        "orientation_score", "solar_irradiance"]]

pred = model.predict(X)
print("Predicted Solar Output (kWh/day):", pred[0])
