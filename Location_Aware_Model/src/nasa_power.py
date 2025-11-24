# src/nasa_power.py
import requests
from datetime import datetime, timedelta

POWER_BASE = "https://power.larc.nasa.gov/api/temporal/daily/point"

def _format_date(d: datetime) -> str:
    return d.strftime("%Y%m%d")

def get_average_irradiance(lat: float, lon: float, days: int = 30):
    """
    Fetch daily ALLSKY_SFC_SW_DWN from NASA POWER for the past `days` days
    and return an estimated average solar irradiance in kWh/m^2/day.
    
    Heuristic for units:
      - POWER daily "ALLSKY_SFC_SW_DWN" is commonly in W/m^2 (instantaneous) or Wh/m^2,
        different communities sometimes return different units. The API metadata does not
        always clearly state units in a reliable key, so we use a robust heuristic:
         - If daily values are large (>> 1000), assume they are Wh/m^2 (divide by 1000 to get kWh/day).
         - Otherwise assume they are mean W/m^2 (multiply by 24 / 1000 to convert to kWh/m^2/day).
    Returns:
      avg_kwh_per_m2_day (float) or raises requests.HTTPError on network issues
    """
    end = datetime.utcnow().date()
    start = end - timedelta(days=max(1, days - 1))
    params = {
        "parameters": "ALLSKY_SFC_SW_DWN",
        "community": "RE",      # renewable energy community
        "longitude": float(lon),
        "latitude": float(lat),
        "start": _format_date(start),
        "end": _format_date(end),
        "format": "JSON"
    }

    resp = requests.get(POWER_BASE, params=params, timeout=20)
    resp.raise_for_status()
    data = resp.json()

    # Navigate to daily parameter dictionary
    try:
        series = data["properties"]["parameter"]["ALLSKY_SFC_SW_DWN"]
    except KeyError:
        raise ValueError("Unexpected API response structure from NASA POWER")

    # series keys are dates YYYYMMDD -> numeric
    values = []
    for k, v in series.items():
        try:
            values.append(float(v))
        except Exception:
            continue

    if not values:
        raise ValueError("No irradiance values returned by NASA POWER for this location/date range")

    mean_val = sum(values) / len(values)

    # heuristic unit correction:
    # if mean_val is greater than 1000 assume it's Wh/m2/day (direct daily totals) -> convert to kWh/m2/day
    if mean_val > 1000:
        avg_kwh = mean_val / 1000.0
    else:
        # otherwise assume mean_val is an average W/m^2 -> convert to daily by *24 hours /1000
        avg_kwh = mean_val * 24.0 / 1000.0

    return round(float(avg_kwh), 3)
