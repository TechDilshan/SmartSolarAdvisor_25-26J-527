import numpy as np
import pandas as pd

def add_features(df):
    # Ensure correct datatypes
    df["direction"] = pd.to_numeric(df["direction"], errors="coerce")
    df["tilt"] = pd.to_numeric(df["tilt"], errors="coerce")

    # Replace invalid values with 0 (or choose a default)
    df["direction"] = df["direction"].fillna(180)   # default south-facing
    df["tilt"] = df["tilt"].fillna(20)              # default tilt

    # Convert angles to radians
    df["direction_rad"] = np.radians(df["direction"])
    df["tilt_rad"] = np.radians(df["tilt"])

    # Calculate orientation score
    df["orientation_score"] = (
        np.cos(df["direction_rad"] - np.radians(180)) *   # ideal: 180° (south)
        np.cos(df["tilt_rad"] - np.radians(20))           # ideal: 20° tilt
    )

    # Replace NaN values
    df["orientation_score"] = df["orientation_score"].fillna(0)

    return df
