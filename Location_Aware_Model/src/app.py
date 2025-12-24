import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import streamlit as st
import pandas as pd
import folium
from streamlit_folium import st_folium
from dotenv import load_dotenv
import os

from src.features import add_features
from src.model import load_model
from src.nasa_power import get_average_irradiance
from src.knn_matcher import LocationKNN
from src.data_loader import load_dataset


# Load API Key
load_dotenv()
API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

st.title("Smart Solar Advisor - Solar Output Prediction")

# Map Section – Select Location
st.subheader("📍 Select Your Roof Location on the Map")

# Create the map centered on Sri Lanka
m = folium.Map(location=[7.8731, 80.7718], zoom_start=7)

# Clicking on map shows popup with coordinates
m.add_child(folium.LatLngPopup())

# Display map and capture click data
map_data = st_folium(m, height=450, width=700)

# Default lat/lon
lat, lon = None, None

# Extract clicked coordinates
if map_data and map_data.get("last_clicked"):
    lat = map_data["last_clicked"]["lat"]
    lon = map_data["last_clicked"]["lng"]
    st.success(f"📍 Selected Location: {lat}, {lon}")

# Roof & Solar Details
st.subheader("🏠 Roof & Solar Details")

roof_area = st.number_input("Roof Area (m²)", min_value=5.0,
                            value=st.session_state.get("roof_area", 10.0),
                            key="roof_area")

efficiency = st.number_input(
    "Panel Efficiency (%)", min_value=10.0,
    max_value=25.0, value=18.0
)

tilt = st.slider(
    "Tilt Angle (°)", min_value=0,
    max_value=45, value=20
)

direction = st.slider(
    "Orientation Direction (°)", min_value=0,
    max_value=360, value=180
)

# Default solar irradiance (can be replaced by NASA API)
if "solar_irradiance" not in st.session_state:
    st.session_state.solar_irradiance = 5.5

solar_irradiance = st.number_input(
    "Solar Irradiance (kWh/m²/day)",
    value=st.session_state.solar_irradiance,
    format="%.3f",
    key="irradiance"
)

# NASA POWER Button – Fetch Solar Irradiance
col1, col2 = st.columns([1, 3])

with col1:
    if st.button("Auto-fetch irradiance from NASA POWER"):
        if lat is None:
            st.error("Please select a location on the map first.")
        else:
            with st.spinner("Fetching NASA POWER irradiance..."):
                try:
                    avg = get_average_irradiance(lat, lon, days=30)
                    st.session_state.solar_irradiance = avg
                    st.success(f"NASA POWER estimate: {avg} kWh/m²/day (30-day mean)")
                except Exception as e:
                    st.error(f"Could not fetch irradiance: {e}")

#It will calculate the average solar irradiance over the last 30 days
with col2:
    st.write("Tip: This fetches the 30-day mean irradiance from NASA POWER.")

# Hybrid KNN + XGBOOST Prediction
st.subheader("🔮 Predict Solar Output")

show_neighbors = st.checkbox(
    "🗺️ Show similar rooftops used for prediction",
    value=False
)

if st.button("Predict Solar Output"):
    if lat is None:
        st.error("Please click a location on the map.")
    else:
        # Create input row
        row = pd.DataFrame([{
            "latitude": lat,
            "longitude": lon,
            "roof_area": roof_area,
            "efficiency": efficiency / 100,
            "tilt": tilt,
            "direction": direction,
            "solar_irradiance": st.session_state.solar_irradiance
        }])

        # Generate additional features (orientation score, etc.)
        row = add_features(row)

        # Select final feature set
        X = row[
            ["latitude", "longitude", "roof_area", "efficiency",
             "tilt", "direction", "orientation_score", "solar_irradiance"]
        ]

        # Load trained model
        model = load_model()

        # Load full dataset for location matching
        df_all = add_features(load_dataset())

        # Initialize KNN matcher
        knn = LocationKNN(df_all, k=20)

        # Find similar rooftops
        neighbors = knn.get_neighbors(lat, lon)

        # XGBoost prediction (global model)
        local_pred = model.predict(X)[0]

        weighted_avg = (
        # Weighted KNN average (location-based estimate)
            (neighbors["actual_generation_kwh"] * neighbors["weight"]).sum()
            / neighbors["weight"].sum()
        )

        # Final hybrid prediction
        final_pred = 0.6 * local_pred + 0.4 * weighted_avg

        # Display result
        st.success(
            f"⚡ Estimated Solar Output (Hybrid Model): "
            f"**{final_pred:.2f} kWh/day**"
        )

         # ---------- NEIGHBOR MAP (SAFE) ----------
        if show_neighbors:
            st.subheader("🗺️ Nearby Similar Rooftops Used for Prediction")

            neighbor_map = folium.Map(location=[lat, lon], zoom_start=13)

            folium.Marker(
                [lat, lon],
                popup="📍 Selected Location",
                icon=folium.Icon(color="red", icon="home")
            ).add_to(neighbor_map)

            for _, row_n in neighbors.iterrows():
                folium.CircleMarker(
                    location=[row_n["latitude"], row_n["longitude"]],
                    radius=5 + 15 * row_n["weight"] / neighbors["weight"].max(),
                    color="blue",
                    fill=True,
                    fill_opacity=0.6,
                    popup=(
                        f"⚡ Actual: {row_n['actual_generation_kwh']:.2f} kWh/day<br>"
                        f"📏 Weight: {row_n['weight']:.4f}"
                    )
                    ).add_to(neighbor_map)

            st_folium(neighbor_map, height=450)


