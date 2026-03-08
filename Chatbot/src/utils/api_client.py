"""
Live data API client for the Smart Solar Advisor.

Connects to three monitoring APIs provided by other project components:
  - /sites-summary      : list all registered solar sites
  - /nearest-location   : latest sensor readings closest to a lat/lon
  - /aggregate-data     : daily or monthly averages for a lat/lon

A geocoding API is used to convert user-supplied location names to coordinates.
"""
import re
import requests
from typing import Dict, List, Optional

# ---------------------------------------------------------------------------
# Endpoint configuration
# ---------------------------------------------------------------------------
_SITES_URL    = "https://nbbackend.solaradvisor.site/sites-summary"
_NEAREST_URL  = "https://nbbackend.solaradvisor.site/nearest-location"
_AGGREGATE_URL = "https://nbbackend.solaradvisor.site/aggregate-data"
_GEO_URL      = "http://api.openweathermap.org/geo/1.0/direct"
_GEO_APPID    = "dcac4d4dd117b0702f0af20b9a8455ca"
_TIMEOUT      = 10  # seconds

# Words that are never place names — used when parsing the user query
_NON_PLACE_WORDS = {
    'today', 'now', 'that', 'this', 'the', 'solar', 'panel', 'what',
    'where', 'how', 'much', 'currently', 'level', 'monthly', 'daily',
    'yesterday', 'tomorrow', 'week', 'month', 'year', 'time', 'place',
    'unit', 'site', 'output', 'predict', 'tell', 'show', 'get', 'check',
    'give', 'me', 'latest', 'average', 'data', 'report', 'reading',
}


# ---------------------------------------------------------------------------
# Raw API calls
# ---------------------------------------------------------------------------

def get_sites_summary() -> List[Dict]:
    """GET /sites-summary — return all registered solar installation sites."""
    r = requests.get(_SITES_URL, timeout=_TIMEOUT)
    r.raise_for_status()
    return r.json()


def get_coordinates(location_name: str) -> Optional[Dict]:
    """Resolve a location name to lat/lon via geocoding API.

    Returns a dict with keys ``lat``, ``lon``, ``name``, ``country``
    or ``None`` if the location is not found.
    """
    params = {"q": location_name, "limit": 1, "appid": _GEO_APPID}
    r = requests.get(_GEO_URL, params=params, timeout=_TIMEOUT)
    r.raise_for_status()
    data = r.json()
    if data:
        return {
            "lat":     data[0]["lat"],
            "lon":     data[0]["lon"],
            "name":    data[0].get("name", location_name),
            "country": data[0].get("country", ""),
        }
    return None


def get_nearest_location_data(lat: float, lon: float) -> List[Dict]:
    """POST /nearest-location — latest sensor readings for a coordinate."""
    r = requests.post(
        _NEAREST_URL,
        json={"latitude": lat, "longitude": lon},
        timeout=_TIMEOUT,
    )
    r.raise_for_status()
    return r.json()


def get_aggregate_data(lat: float, lon: float, mode: str = "daily") -> Dict:
    """POST /aggregate-data — aggregated stats for a coordinate.

    ``mode`` must be ``'daily'`` or ``'monthly'``.
    """
    r = requests.post(
        _AGGREGATE_URL,
        json={"latitude": lat, "longitude": lon, "mode": mode},
        timeout=_TIMEOUT,
    )
    r.raise_for_status()
    return r.json()


# ---------------------------------------------------------------------------
# Intent detection
# ---------------------------------------------------------------------------

def detect_api_intent(query: str) -> Optional[str]:
    """Classify the query as an API intent or return None.

    Returns:
        ``'sites'``      — user wants to know about registered solar sites.
        ``'live_data'``  — user wants the latest sensor reading for a place.
        ``'aggregate'``  — user wants daily/monthly averages for a place.
        ``None``         — query is not related to live monitoring data.
    """
    q = query.lower()

    site_keywords = [
        'where', 'location', 'placed', 'installed', 'site', 'customer',
        'solar unit', 'sites', 'registered', 'monitored',
    ]
    live_keywords = [
        'dust level', 'humidity', 'irradiance', 'temperature', 'rainfall',
        'output', 'today', 'right now', 'current', 'latest', 'now', 'live',
        'reading', 'sensor',
    ]
    agg_keywords = [
        'monthly', 'daily', 'average', 'month', 'day', 'aggregate',
        'predict', 'kwh', 'total', 'prediction',
    ]

    has_live = any(kw in q for kw in live_keywords)
    has_agg  = any(kw in q for kw in agg_keywords)

    # Sites query: location/site keywords without data-specific keywords
    if any(kw in q for kw in site_keywords) and not has_live and not has_agg:
        return 'sites'

    # Aggregate takes priority when period keywords are present
    if has_agg:
        return 'aggregate'

    # Latest sensor reading
    if has_live:
        return 'live_data'

    return None


# ---------------------------------------------------------------------------
# Location name extraction
# ---------------------------------------------------------------------------

def extract_location_name(query: str) -> Optional[str]:
    """Try to pull a place name out of a natural-language query.

    Looks for words following common location prepositions (in, at, of, for,
    near) or immediately before time-stamp keywords.  Returns the candidate
    with title-case applied, or ``None`` if nothing suitable is found.
    """
    q = query.lower()

    patterns = [
        # "in gampaha", "at london", "of colombo", "for kandy", "near negombo"
        r'\b(?:in|at|of|for|near)\s+([a-zA-Z][a-zA-Z]*(?:\s+[a-zA-Z]+){0,2})',
        # "gampaha today", "colombo monthly"
        r'([a-zA-Z][a-zA-Z]+)\s+(?:today|monthly|daily|now|currently|location)',
    ]

    for pattern in patterns:
        for match in re.finditer(pattern, q):
            candidate = match.group(1).strip()
            words = candidate.split()
            first = words[0] if words else ""
            # Skip common non-place words and digit-starting tokens (e.g. "4am")
            if first and first not in _NON_PLACE_WORDS and not re.match(r'\d', first):
                return " ".join(w.capitalize() for w in words)

    return None


def extract_time_mode(query: str) -> str:
    """Return ``'monthly'`` or ``'daily'`` based on the query wording."""
    if any(w in query.lower() for w in ("month", "monthly")):
        return "monthly"
    return "daily"


# ---------------------------------------------------------------------------
# Response formatters
# ---------------------------------------------------------------------------

def format_sites_response(sites: List[Dict]) -> str:
    if not sites:
        return "No solar installation sites are currently registered in the system."

    lines = [f"**Solar Installation Sites ({len(sites)} found):**\n"]
    for site in sites:
        lat = site.get("latitude", "N/A")
        lon = site.get("longitude", "N/A")
        lat_str = f"{lat:.4f}" if isinstance(lat, float) else str(lat)
        lon_str = f"{lon:.4f}" if isinstance(lon, float) else str(lon)
        lines.append(
            f"- **Site ID:** {site.get('site', 'N/A')}\n"
            f"  **Customer:** {site.get('customer', 'N/A')}\n"
            f"  **Coordinates:** {lat_str}°N, {lon_str}°E\n"
            f"  **First Recorded Date:** {site.get('first_date', 'N/A')}"
        )
    return "\n\n".join(lines)


def format_live_data_response(records: List[Dict], location_name: str) -> str:
    if not records:
        return f"No data found for **{location_name}**."

    lines = [f"**Latest Solar Data for {location_name}:**\n"]
    for rec in records:
        kwh = rec.get("predicted_kwh_per5min")
        kwh_str = f"{kwh:.4f}" if isinstance(kwh, (int, float)) else str(kwh)
        lines.append(
            f"**Date:** {rec.get('date', 'N/A')}  |  **Time:** {rec.get('time', 'N/A')}\n"
            f"- Irradiance: {rec.get('irradiance', 'N/A')} W/m²\n"
            f"- Temperature: {rec.get('temperature', 'N/A')} °C\n"
            f"- Humidity: {rec.get('humidity', 'N/A')} %\n"
            f"- Dust Level: {rec.get('dust_level', 'N/A')}\n"
            f"- Rainfall: {rec.get('rainfall', 'N/A')} mm\n"
            f"- Panel Area: {rec.get('panel_area_m2', 'N/A')} m²\n"
            f"- Predicted Output: {kwh_str} kWh (per 5 min)"
        )
    return "\n\n".join(lines)


def format_aggregate_response(data: Dict, location_name: str, mode: str) -> str:
    if not data:
        return f"No {mode} data found for **{location_name}**."

    label = "Monthly" if mode == "monthly" else "Daily"
    lines = [f"**{label} Solar Data Averages for {location_name}:**\n"]
    for period, stats in data.items():
        def _fmt(val, decimals=2):
            return f"{val:.{decimals}f}" if isinstance(val, (int, float)) else str(val)

        lines.append(
            f"**Period:** {period}\n"
            f"- Avg Irradiance: {_fmt(stats.get('average_irradiance', 'N/A'))} W/m²\n"
            f"- Avg Temperature: {_fmt(stats.get('average_temperature', 'N/A'))} °C\n"
            f"- Avg Humidity: {_fmt(stats.get('average_humidity', 'N/A'))} %\n"
            f"- Avg Dust Level: {_fmt(stats.get('average_dust_level', 'N/A'), 4)}\n"
            f"- Avg Rainfall: {_fmt(stats.get('average_rainfall', 'N/A'))} mm"
        )
    return "\n\n".join(lines)
