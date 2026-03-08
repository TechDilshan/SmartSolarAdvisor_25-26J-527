import os
from datetime import datetime
from threading import RLock

import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from sklearn.neighbors import BallTree

from firebase_config import ref

EARTH_RADIUS_KM = 6371.0088

app = Flask(__name__)

cors_origins_env = os.getenv("CORS_ORIGINS", "").strip()
if cors_origins_env:
    origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
    CORS(app, resources={r"/*": {"origins": origins}})
else:
    CORS(app)

_data_lock = RLock()
records = []
coordinates_rad = None
tree = None
sites_info = []


def _parse_float(value, name):
    try:
        return float(value)
    except (TypeError, ValueError):
        raise ValueError(f"Invalid {name}. Must be a number.")


def _validate_lat_lon(lat, lon):
    if not (-90 <= lat <= 90):
        raise ValueError("latitude must be between -90 and 90.")
    if not (-180 <= lon <= 180):
        raise ValueError("longitude must be between -180 and 180.")


def _parse_date_yyyy_mm_dd(value, name):
    if value is None or value == "":
        return None
    if not isinstance(value, str):
        raise ValueError(f"{name} must be a string in YYYY-MM-DD format.")
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        raise ValueError(f"{name} must be in YYYY-MM-DD format.")


def _load_data_from_firebase():
    raw_data = ref.get() or {}

    new_records = []
    coords = []
    new_sites_info = []

    for customer_key, customer in raw_data.items():
        if not isinstance(customer, dict):
            continue
        for site_key, site in customer.items():
            if not isinstance(site, dict):
                continue

            first_date = None
            site_lat = None
            site_lon = None

            timestamps = sorted(site.keys())
            for timestamp in timestamps:
                record = site.get(timestamp)
                if not isinstance(record, dict):
                    continue
                if "latitude" not in record or "longitude" not in record:
                    continue

                new_records.append(record)
                coords.append([record["latitude"], record["longitude"]])

                if site_lat is None and site_lon is None:
                    first_date = record.get("date")
                    site_lat = record.get("latitude")
                    site_lon = record.get("longitude")

            if site_lat is not None and site_lon is not None:
                new_sites_info.append(
                    {
                        "customer": customer_key,
                        "site": site_key,
                        "latitude": site_lat,
                        "longitude": site_lon,
                        "first_date": first_date,
                    }
                )

    if not coords:
        return [], None, None, []

    coords_rad = np.radians(np.array(coords, dtype=float))
    new_tree = BallTree(coords_rad, metric="haversine")
    return new_records, coords_rad, new_tree, new_sites_info


def reload_data():
    global records, coordinates_rad, tree, sites_info
    with _data_lock:
        records, coordinates_rad, tree, sites_info = _load_data_from_firebase()


reload_data()


@app.route("/nearest-location", methods=["POST"])
def find_nearest():
    try:
        data = request.get_json(force=True) or {}
        new_lat = _parse_float(data.get("latitude"), "latitude")
        new_lon = _parse_float(data.get("longitude"), "longitude")
        _validate_lat_lon(new_lat, new_lon)

        k = data.get("k")
        radius_km = data.get("radius_km")
        include_distance = bool(data.get("include_distance", True))

        if k is not None:
            try:
                k = int(k)
            except (TypeError, ValueError):
                raise ValueError("k must be an integer.")
            if k <= 0:
                raise ValueError("k must be > 0.")

        if radius_km is not None:
            radius_km = _parse_float(radius_km, "radius_km")
            if radius_km <= 0:
                raise ValueError("radius_km must be > 0.")

        with _data_lock:
            if tree is None or not records:
                return jsonify({"error": "No data available. Load predictions into Firebase first."}), 503

            new_point = np.radians(np.array([[new_lat, new_lon]], dtype=float))

            if radius_km is not None:
                radius_rad = radius_km / EARTH_RADIUS_KM
                ind_arr, dist_arr = tree.query_radius(
                    new_point, r=radius_rad, return_distance=True, sort_results=True
                )
                inds = ind_arr[0].tolist()
                dists_km = (dist_arr[0] * EARTH_RADIUS_KM).tolist()
            else:
                effective_k = k if k is not None else min(len(records), 200)
                dist, ind = tree.query(new_point, k=effective_k)
                inds = ind[0].tolist()
                dists_km = (dist[0] * EARTH_RADIUS_KM).tolist()

            out = []
            for i, rec_idx in enumerate(inds):
                rec = records[rec_idx]
                if include_distance:
                    merged = dict(rec)
                    merged["distance_km"] = float(dists_km[i])
                    out.append(merged)
                else:
                    out.append(rec)

            return jsonify(out)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception:
        return jsonify({"error": "Internal server error"}), 500


@app.route("/aggregate-data", methods=["POST"])
def aggregate_data():
    try:
        data = request.get_json(force=True) or {}
        new_lat = _parse_float(data.get("latitude"), "latitude")
        new_lon = _parse_float(data.get("longitude"), "longitude")
        _validate_lat_lon(new_lat, new_lon)

        mode = data.get("mode")  # "daily" | "monthly" | "hourly"
        if mode not in {"daily", "monthly", "hourly"}:
            raise ValueError('mode must be one of: "daily", "monthly", "hourly".')

        start_date = _parse_date_yyyy_mm_dd(data.get("start_date"), "start_date")
        end_date = _parse_date_yyyy_mm_dd(data.get("end_date"), "end_date")
        if start_date and end_date and start_date > end_date:
            raise ValueError("start_date must be <= end_date.")

        with _data_lock:
            if tree is None or not records:
                return jsonify({"error": "No data available. Load predictions into Firebase first."}), 503

            new_point = np.radians(np.array([[new_lat, new_lon]], dtype=float))
            _, ind = tree.query(new_point, k=1)
            nearest_index = int(ind[0][0])

            nearest_lat = records[nearest_index].get("latitude")
            nearest_lon = records[nearest_index].get("longitude")

            matched = [
                r
                for r in records
                if r.get("latitude") == nearest_lat and r.get("longitude") == nearest_lon and "date" in r
            ]

        if start_date or end_date:
            filtered = []
            for r in matched:
                try:
                    d = datetime.strptime(r["date"], "%Y-%m-%d").date()
                except Exception:
                    continue
                if start_date and d < start_date:
                    continue
                if end_date and d > end_date:
                    continue
                filtered.append(r)
            matched = filtered

        buckets = {}
        if mode == "daily":
            for r in matched:
                key = r["date"]
                buckets.setdefault(key, []).append(r)
        elif mode == "monthly":
            for r in matched:
                key = r["date"][:7]
                buckets.setdefault(key, []).append(r)
        else:  # hourly
            for r in matched:
                t = r.get("time", "")
                hour = t[:2] if isinstance(t, str) and len(t) >= 2 else "00"
                key = f'{r["date"]} {hour}'
                buckets.setdefault(key, []).append(r)

        output = {k: calculate_stats(items) for k, items in buckets.items()}
        return jsonify(output)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception:
        return jsonify({"error": "Internal server error"}), 500


def calculate_stats(items):
    dust = np.mean([r["dust_level"] for r in items])
    humidity = np.mean([r["humidity"] for r in items])
    irradiance = np.mean([r["irradiance"] for r in items])
    rainfall = np.mean([r["rainfall"] for r in items])
    temperature = np.mean([r["temperature"] for r in items])
    total_kwh = np.sum([r["predicted_kwh_per5min"] for r in items])

    return {
        "average_dust_level": float(dust),
        "average_humidity": float(humidity),
        "average_irradiance": float(irradiance),
        "average_rainfall": float(rainfall),
        "average_temperature": float(temperature),
        "total_predicted_kwh_per5min": float(total_kwh),
    }


@app.route("/sites-summary", methods=["GET"])
def get_sites_summary():
    with _data_lock:
        return jsonify(sites_info)


@app.route("/reload-data", methods=["POST"])
def reload_data_endpoint():
    admin_token = os.getenv("ADMIN_TOKEN", "").strip()
    if not admin_token:
        return jsonify({"error": "ADMIN_TOKEN is not configured on the server."}), 503

    header_token = request.headers.get("X-Admin-Token", "").strip()
    if header_token != admin_token:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        reload_data()
        with _data_lock:
            return jsonify({"ok": True, "records": len(records), "sites": len(sites_info)})
    except Exception:
        return jsonify({"error": "Failed to reload data."}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5007)