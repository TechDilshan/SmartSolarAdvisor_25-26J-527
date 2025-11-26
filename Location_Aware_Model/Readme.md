SMART SOLAR ADVISOR: IoT-Enabled Hybrid ML for Location-Aware Solar Prediction
Project ID: 25-26J-527

Student ID: IT22341204
Student Name: K Rangana Malmi Nadee
Student Phone No- 0754907285

Component Overview
IoT-Enabled Hybrid ML for Location-Aware Solar Prediction is a location-aware solar prediction system that uses hybrid machine learning, IoT monitoring, and GIS-based map selection to estimate solar energy potential for any selected location.
The system integrates:

# XGBoost-based predictive modeling
# NASA POWER solar irradiance API
# Interactive map coordinate picker (Streamlit + Folium)
# IoT device simulation for real-time solar readings
# Roof-based feature engineering (tilt, direction, orientation score)

This project helps homeowners, engineers, and solar planners estimate the most suitable solar installation parameters and potential energy yield.

Key Features
1.Interactive Map Location Selection
# Users can click any location on the map.
# Latitude & Longitude automatically populate into the form.

2.Automatic Solar Irradiance Fetching
# NASA POWER API fetches 30-day average irradiance.
# Converts results into kWh/m²/day with unit correction.

3.Hybrid ML Model
Inputs:
# Latitude
# Longitude
# Roof area
# Panel efficiency
# Tilt
# Direction
# Orientation score
# Solar irradiance
Output:
# Predicted daily solar energy generation (kWh/day)

4.IoT Data Integration
# Simulated IoT sensors can feed real-time irradiance or temperature for advanced predictions.

5.Modern Streamlit Frontend
# Clean and responsive User Interface(UI)
# Real-time feedback and input validation
# Instant Solar Output predictions

How to Run the Project
1. Clone the repository
2. Install dependencies
   # pip install -r requirements.txt
3. Train the model
   # python scripts/train.py 
   This generate file  -> models/xgb_model.pkl

3. Run App
   # streamlit run src/app.py

Local URL - http://localhost:8501
Network URL: http://192.168.8.138:8501