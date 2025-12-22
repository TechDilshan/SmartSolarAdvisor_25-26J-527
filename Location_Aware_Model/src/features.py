import numpy as np
import pandas as pd

DIRECTION_MAP = {
    "N": 0, "NE": 45, "E": 90,
    "SE": 135, "S": 180,
    "SW": 225, "W": 270, "NW": 315
}

def add_features(df):
    df = df.copy()

    # Convert direction
    if df["direction"].dtype == object:
        df["direction"] = df["direction"].map(DIRECTION_MAP)

    df["direction"] = df["direction"].fillna(180)
    df["tilt"] = df["tilt"].fillna(20)

    df["direction_rad"] = np.radians(df["direction"])
    df["tilt_rad"] = np.radians(df["tilt"])

    df["orientation_score"] = (
        np.cos(df["direction_rad"] - np.pi) *
        np.cos(df["tilt_rad"] - np.radians(20))
    ).clip(0, 1)

    return df
