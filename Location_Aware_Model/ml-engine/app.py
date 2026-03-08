# app.py

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from sklearn.neighbors import BallTree
from firebase_config import ref

app = Flask(__name__)
CORS(app)

# ====== LOAD DATA ONCE AT STARTUP ======
raw_data = ref.get()

records = []
coordinates = []

for customer in raw_data.values():
    for site in customer.values():
        for timestamp, record in site.items():

            if "latitude" in record and "longitude" in record:
                records.append(record)
                coordinates.append([record["latitude"], record["longitude"]])

# Convert to radians
coordinates = np.radians(coordinates)

# Build BallTree
tree = BallTree(coordinates, metric="haversine")

# =======================================

@app.route("/nearest-location", methods=["POST"])
def find_nearest():

    data = request.json
    new_lat = float(data["latitude"])
    new_lon = float(data["longitude"])

    new_point = np.radians([[new_lat, new_lon]])

    # Get all neighbors sorted by distance
    dist, ind = tree.query(new_point, k=len(records))

    matched_records = []

    for i in ind[0]:
        matched_records.append(records[i])

    return jsonify(matched_records)


@app.route("/aggregate-data", methods=["POST"])
def aggregate_data():

    data = request.json
    new_lat = float(data["latitude"])
    new_lon = float(data["longitude"])
    mode = data["mode"]  # "daily" or "monthly"

    new_point = np.radians([[new_lat, new_lon]])

    dist, ind = tree.query(new_point, k=1)
    nearest_index = ind[0][0]

    nearest_lat = records[nearest_index]["latitude"]
    nearest_lon = records[nearest_index]["longitude"]

    # Filter records for same location
    matched = [
        r for r in records
        if r["latitude"] == nearest_lat and r["longitude"] == nearest_lon
    ]

    if mode == "daily":
        # group by date
        result = {}
        for r in matched:
            date = r["date"]
            result.setdefault(date, []).append(r)

        output = {}

        for date, items in result.items():
            output[date] = calculate_stats(items)

        return jsonify(output)

    elif mode == "monthly":
        result = {}
        for r in matched:
            month = r["date"][:7]  # YYYY-MM
            result.setdefault(month, []).append(r)

        output = {}

        for month, items in result.items():
            output[month] = calculate_stats(items)

        return jsonify(output)

    else:
        return jsonify({"error": "Invalid mode"}), 400


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
        "total_predicted_kwh_per5min": float(total_kwh)
    }


# ====== LOAD DATA ONCE AT STARTUP ======
raw_data = ref.get()

records = []
coordinates = []
sites_info = []  # <-- new structure

for customer_key, customer in raw_data.items():
    for site_key, site in customer.items():

        first_date = None
        site_lat = None
        site_lon = None

        # sort timestamps to find earliest
        timestamps = sorted(site.keys())

        for idx, timestamp in enumerate(timestamps):
            record = site[timestamp]

            if "latitude" in record and "longitude" in record:
                records.append(record)
                coordinates.append([record["latitude"], record["longitude"]])

                # capture site-level lat/lon from first valid record
                if idx == 0:
                    first_date = record.get("date")
                    site_lat = record.get("latitude")
                    site_lon = record.get("longitude")

        # store site info
        if site_lat is not None:
            sites_info.append({
                "customer": customer_key,
                "site": site_key,
                "latitude": site_lat,
                "longitude": site_lon,
                "first_date": first_date
            })

# Convert to radians
coordinates = np.radians(coordinates)

# Build BallTree
tree = BallTree(coordinates, metric="haversine")

@app.route("/sites-summary", methods=["GET"])
def get_sites_summary():
    return jsonify(sites_info)

if __name__ == "__main__":
    app.run(debug=True, port=5007)