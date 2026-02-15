"""
Anomaly detection for IoT/sensor and prediction data (proposal: Isolation Forest).
Used to detect and correct faulty sensor readings, shading issues, or transmission errors.
"""
import numpy as np
from typing import List, Dict, Any, Optional, Tuple

try:
    from sklearn.ensemble import IsolationForest
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False


def detect_sensor_anomalies(
    readings: List[Dict[str, float]],
    feature_keys: Optional[List[str]] = None,
    contamination: float = 0.05,
) -> Tuple[List[int], Optional[Any]]:
    """
    Flag anomalous sensor readings using Isolation Forest.
    readings: list of dicts with numeric fields (e.g. irradiance, temperature, humidity).
    feature_keys: keys to use as features; default ['solar_irradiance', 'temperature', 'humidity'].
    Returns: (indices of inliers, fitted model or None if sklearn missing).
    """
    if not HAS_SKLEARN or not readings:
        return list(range(len(readings))), None

    feature_keys = feature_keys or ["solar_irradiance", "temperature", "humidity"]
    X = []
    for r in readings:
        row = []
        for k in feature_keys:
            v = r.get(k)
            if v is None:
                v = np.nan
            row.append(float(v))
        X.append(row)
    X = np.array(X)
    # Replace NaN with column median for fitting
    for j in range(X.shape[1]):
        col = X[:, j]
        med = np.nanmedian(col)
        col[np.isnan(col)] = med
        X[:, j] = col

    clf = IsolationForest(random_state=42, contamination=contamination)
    pred = clf.fit_predict(X)
    inliers = [i for i, p in enumerate(pred) if p == 1]
    return inliers, clf


def correct_or_flag_reading(
    reading: Dict[str, float],
    recent_readings: List[Dict[str, float]],
    key: str = "solar_irradiance",
    z_threshold: float = 3.0,
) -> Dict[str, Any]:
    """
    Simple correction: if value is an outlier vs recent readings, replace with median.
    Returns dict with corrected value and 'was_anomaly' flag.
    """
    values = [r.get(key) for r in recent_readings if r.get(key) is not None]
    if not values:
        return {"value": reading.get(key), "was_anomaly": False}
    arr = np.array(values, dtype=float)
    med = np.median(arr)
    std = np.std(arr)
    if std == 0:
        std = 1e-6
    current = reading.get(key)
    if current is None:
        return {"value": med, "was_anomaly": False}
    z = abs(float(current) - med) / std
    if z > z_threshold:
        return {"value": med, "was_anomaly": True}
    return {"value": current, "was_anomaly": False}
