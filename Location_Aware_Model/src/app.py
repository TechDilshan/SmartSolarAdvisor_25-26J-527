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
from src.roof_detection import (
    get_satellite_image,
    segment_roof,
    calculate_roof_area,
    detect_roof_tilt,
    calculate_orientation
)

# Load API Key
load_dotenv()
API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

st.title("🔆 Smart Solar Advisor – Solar Output Prediction")

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

roof_area = st.number_input("Roof Area (m²)", min_value=1.0,
                            value=st.session_state.get("roof_area", 10.0),
                            key="roof_area")

efficiency = st.number_input("Panel Efficiency (%)",
                             value=st.session_state.get("efficiency", 18.0),
                             key="efficiency")

tilt = st.slider("Tilt Angle (°)", 0, 45,
                 value=st.session_state.get("tilt", 20),
                 key="tilt")

direction = st.slider("Direction (°)", 0, 360,
                      value=st.session_state.get("direction", 180),
                      key="direction")

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

# Prediction Section
st.subheader("🔮 Predict Solar Output")

if st.button("Predict Solar Output"):
    if lat is None:
        st.error("Please click a location on the map.")
    else:
        # Load ML model
        model = load_model()

        # Create input row
        row = pd.DataFrame([{
            "latitude": lat,
            "longitude": lon,
            "roof_area": roof_area,
            "efficiency": efficiency,
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

        # Predict
        pred = model.predict(X)[0]

        # Display result
        st.success(f"⚡ Estimated Solar Output: **{pred:.2f} kWh/day**")

#  Auto-detect Roof from Satellite Image
st.subheader("🛰 Auto-detect Roof from Satellite Image")

api_key = API_KEY

if st.button("Detect Roof Automatically"):
    if lat is None:
        st.error("Select a location on the map first.")
    elif not api_key:
          st.error("Google Maps API Key is missing. Check your .env file.")
    else:
        with st.spinner("Downloading satellite image..."):
            img, err = get_satellite_image(lat, lon, api_key)
            if err:
                st.error(err)
            else:
                st.image(img, caption="Satellite Image", use_column_width=True)

                with st.spinner("Detecting roof area..."):
                    mask, results = segment_roof(img)

                    if mask is None:
                        st.error("No roof detected!")
                    else:
                        area = calculate_roof_area(mask)
                        roof_type = detect_roof_tilt(img)
                        orientation = calculate_orientation(mask)

                        st.success("Roof detected!")

                        # Show results
                        st.write(f"**Detected Roof Area:** {area} m²")
                        st.write(f"**Roof Type:** {roof_type}")
                        st.write(f"**Orientation Angle:** {orientation}°")

                        # Auto-fill inputs
                        st.session_state.roof_area = area
                        st.session_state.direction = orientation
                        st.session_state.tilt = 15 if roof_type == "Flat Roof" else 25

                        st.info("Auto-filled roof details applied.")
