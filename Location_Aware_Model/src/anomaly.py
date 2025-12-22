from sklearn.ensemble import IsolationForest

def remove_anomalies(df):
    features = [
        "roof_area", "efficiency",
        "solar_irradiance", "actual_generation_kwh"
    ]

    iso = IsolationForest(contamination=0.05, random_state=42)
    mask = iso.fit_predict(df[features])

    return df[mask == 1]
