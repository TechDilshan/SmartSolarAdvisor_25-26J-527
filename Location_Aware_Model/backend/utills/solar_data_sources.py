"""
Solar and weather data from satellite/external sources for location-aware prediction.
Aligns with proposal: NASA POWER, PVGIS, and real-time weather (OpenWeatherMap in routes/weather.py).
"""
import requests
from datetime import datetime
from typing import Optional, Dict, Any

NASA_POWER_BASE = "https://power.larc.nasa.gov/api/temporal/monthly/point"


def fetch_nasa_power_monthly(
    latitude: float,
    longitude: float,
    year: int,
    month: int,
) -> Optional[Dict[str, float]]:
    """
    Fetch monthly solar and meteorological data from NASA POWER API.
    Returns dict with allsky_sfc_sw_dwn (kWh/m²/day), rh2m (%), t2m (°C), ws2m (m/s).
    Used when OpenWeatherMap is unavailable or for historical/consistent irradiance.
    """
    try:
        params = {
            "parameters": "ALLSKY_SFC_SW_DWN,RH2M,T2M,WS2M",
            "community": "RE",
            "longitude": longitude,
            "latitude": latitude,
            "start": year,
            "end": year,
            "format": "JSON",
        }
        resp = requests.get(NASA_POWER_BASE, params=params, timeout=15)
        if resp.status_code != 200:
            return None
        data = resp.json()
        properties = data.get("properties", {}).get("parameter", {})
        if not properties:
            return None
        # Monthly API returns 12 values per parameter (index 0 = Jan)
        idx = month - 1
        allsky = properties.get("ALLSKY_SFC_SW_DWN", {}).get("monthly", [None] * 12)
        rh2m = properties.get("RH2M", {}).get("monthly", [None] * 12)
        t2m = properties.get("T2M", {}).get("monthly", [None] * 12)
        ws2m = properties.get("WS2M", {}).get("monthly", [None] * 12)
        irradiance = allsky[idx] if idx < len(allsky) and allsky[idx] is not None else None
        rh = rh2m[idx] if idx < len(rh2m) and rh2m[idx] is not None else None
        temp = t2m[idx] if idx < len(t2m) and t2m[idx] is not None else None
        wind = ws2m[idx] if idx < len(ws2m) and ws2m[idx] is not None else None
        if irradiance is None:
            return None
        return {
            "allsky_sfc_sw_dwn": round(float(irradiance), 3),
            "rh2m": round(float(rh), 2) if rh is not None else 75.0,
            "t2m": round(float(temp), 2) if temp is not None else 27.0,
            "ws2m": round(float(wind), 2) if wind is not None else 3.0,
            "source": "NASA_POWER",
        }
    except Exception:
        return None


def fetch_pvgis_radiation(
    latitude: float,
    longitude: float,
    tilt: float = 0,
    azimuth: float = 0,
) -> Optional[Dict[str, Any]]:
    """
    Stub for PVGIS non-interactive API (fixed plane).
    PVGIS 5: https://ec.europa.eu/jrc/en/pvgis/docs
    Returns None here; implement with requests to
    https://re.jrc.ec.europa.eu/api/v5_2/PVcalc for full integration.
    """
    # Optional: implement PVGIS v5 API for hourly/daily irradiance
    return None


def get_irradiance_and_weather(
    latitude: float,
    longitude: float,
    year: int,
    month: int,
) -> Dict[str, float]:
    """
    Preferred helper for prediction pipeline: get allsky_sfc_sw_dwn, rh2m, t2m, ws2m.
    Tries NASA POWER first; falls back to Sri Lanka monthly baseline.
    """
    result = fetch_nasa_power_monthly(latitude, longitude, year, month)
    if result:
        return result
    # Fallback: Sri Lanka monthly baseline (kWh/m²/day) as in energy_calculator
    baseline = {
        1: 5.0, 2: 5.5, 3: 5.8, 4: 5.8, 5: 5.5, 6: 5.0,
        7: 5.0, 8: 5.2, 9: 5.3, 10: 5.5, 11: 5.2, 12: 4.8,
    }
    return {
        "allsky_sfc_sw_dwn": baseline.get(month, 5.3),
        "rh2m": 75.0,
        "t2m": 27.0,
        "ws2m": 3.0,
        "source": "baseline",
    }
