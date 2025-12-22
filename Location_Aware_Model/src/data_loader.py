import pandas as pd

def load_dataset(path="data/solar_dataset.csv"):
    df = pd.read_csv(path)

    required = [
        "latitude", "longitude", "roof_area",
        "efficiency", "tilt", "direction",
        "solar_irradiance", "actual_generation_kwh"
    ]

    for col in required:
        if col not in df.columns:
            raise ValueError(f"Missing required column: {col}")

    return df
