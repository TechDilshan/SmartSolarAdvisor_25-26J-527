# Smart Solar Advisor
## Smart Solar Advisor: IoT-Enabled System with AI-Based Fault Detection and Guidance

**Project ID:** 25-26J-527

---

## Research Topic

Smart Solar Advisor is an intelligent, IoT-enabled solar energy management system that leverages hybrid machine learning models, real-time sensor monitoring, and advanced AI technologies to provide comprehensive solar energy forecasting, anomaly detection, and intelligent consultation services. The system integrates multiple components to deliver accurate predictions, fault detection, and user-friendly interactions for solar energy systems in Sri Lanka.

The research focuses on developing a holistic solution that combines:
- **Real-time IoT sensor integration** for continuous monitoring
- **Anomaly detection algorithms** for proactive fault identification
- **LLM-powered conversational AI** for domain-specific solar energy consultation
- **Location-aware prediction models** using hybrid ML approaches (KNN + XGBoost)

---

## System Components

### 1. Monthly Unit Prediction System

A Smart Solar Unit solar energy prediction system that uses hybrid machine learning models to estimate monthly and daily solar energy generation for any selected location.

**Key Features:**
- Interactive map-based location selection with automatic coordinate detection
- Hybrid ML model combining XGBoost (70%) for accurate predictions
- Integration with NASA POWER API for automatic solar irradiance data fetching
- Real-time prediction dashboard with monthly, daily, and hourly forecasts

**Technologies:**
- Backend: Node.js (Express)
- Frontend: React.js
- Mobile App: React Native
- Database: Firebase
- API: REST API
- Engine: Python


---

## Installation & Run Instructions

### Backend (Node.js API)

```bash
cd SmartSolarUnit/SmartSolar_Backend
npm install
nodemon server.js
```

---

### Frontend (React.js Web App)

```bash
cd SmartSolarUnit/SmartSolar_WebApp
npm install
npm run dev
```

---

### Mobile App (React Native)

```bash
cd SmartSolarUnit/SmartSolarApp
npm install
# For iOS
npx react-native run-android
# For Android
npx react-native run-ios
```

---

### Python Engine (Prediction/Simulation Engine)

```bash
cd SmartSolarUnit/solar_python_engine
# Activate virtual environment (if using venv)
source venv/bin/activate  # On macOS/Linux
# or
venv\Scripts\activate     # On Windows

pip install -r requirements.txt

# Run the prediction engine
python main.py

```

---

**Location:** `SmartSolarUnit/`

---

### 2. Anomaly Fault Detection Module

An intelligent fault detection system that monitors solar panel performance in real-time and identifies anomalies, faults, and performance degradation using machine learning algorithms.

**Key Features:**
-AI-based Anomaly Fault Detection using a Random Forest machine learning model
-Real-time analysis of inverter data to detect performance deviations instantly
-Benchmark dataset comparison using validated South Asian solar PV data
-Accurate fault classification including partial shading, panel degradation, and wiring faults
-Predictive maintenance support through early fault identification
-Dashboard-based fault visualization for easy monitoring and decision-making
-Historical fault logging and report generation for performance analysis
-Automated alert notifications for detected anomalies

**Technologies:**
Machine Learning & Data Processing

-Python – Data preprocessing and machine learning model development
-Scikit-learn – Random Forest model implementation and evaluation
-Pandas & NumPy – Data cleaning, transformation, and feature analysis

Backend & Data Management

-Node.js – Backend services for data handling and API integration
-Heyleys Inverter API – Real-time solar inverter data retrieval
-MongoDB – Storage of real-time data, benchmark datasets, and fault logs

Frontend & Visualization

-React.js – Dashboard interface for real-time monitoring
-Chart.js / Recharts – Visualization of faults, trends, and anomalies

Communication & Security

-REST APIs (HTTPS) – Secure data transmission
-JWT / Role-based access control – Secure dashboard access


---

## Installation & Run Instructions

### Backend (Node.js API)

```bash
cd FaultDetection/backend
npm install
npm run dev 
```

---

### Frontend (React.js Web App)

```bash
cd FaultDetection/frontend
npm install
npm start
```

**Location:** `FaultDetection/`

---

### 3. LLM-Powered Solar Chatbot

A domain-specific conversational AI assistant powered by Retrieval-Augmented Generation (RAG) technology, providing intelligent solar energy consultation in both Sinhala and English.

- RAG (Retrieval-Augmented Generation) System
- Multi-Source Data Integration
- Multiple Application Modes
- Data Processing Pipeline

**Technologies:**
- LLM Integration
- Vector Databases
- Embeddings

---

## Installation & Run Instructions
```bash
# Navigate to project
cd C:\Users\vihan\OneDrive\Desktop\Projects\SmartSolarAdvisor_25-26J-527\Chatbot

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Process data (after adding files to data/ folders)
python run_pipeline.py

# Test search
python test_search.py

# Run web app
python -m streamlit run app_simple.py

# Stop app
Ctrl + C

```


**Location:** `Chatbot/`

---

#### 4. Nearby Site-Based Forecasting

The IoT-Enabled Hybrid ML for Location-Aware Solar Prediction system estimates solar energy potential for any selected location using a combination of:

  # Hybrid machine learning models (Weighted KNN + XGBoost)
  # IoT-based solar monitoring
  # GIS-based interactive map selection
This system enables accurate solar predictions even in data-scarce regions by integrating satellite irradiance data with real-time environmental inputs.

System Integration Overview

The solution integrates the following components:
XGBoost-based predictive modeling for high-accuracy regression
NASA POWER Solar Irradiance API for satellite-derived solar data
Interactive map-based coordinates
IoT device simulation for real-time irradiance and temperature data
Roof-based feature engineering, including:
   Tilt angle
   Direction (azimuth)
   Orientation score
   Roof area

**Key Features:**
 1.Interactive Map Location Selection
# Users can click any geographic location on the map
# Latitude and longitude are automatically extracted and populated

2.Automatic Solar Irradiance Fetching
# Fetches 30-day average solar irradiance using the NASA POWER API
# Converts irradiance values into kWh/m²/day with proper unit normalization

3.Hybrid ML Model
# Combines:
   KNN (30%) – captures spatial similarity using nearby locations
   XGBoost (70%) – models nonlinear relationships and complex interaction
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
# Simulated IoT sensors provide:

Real-time solar irradiance

Ambient temperature

Enables short-term (5-minute interval) forecasting and adaptive predictions

5.Modern Frontend
# Clean, responsive, and user-friendly UI
# Real-time input validation and feedback
# Instant solar energy prediction results

**Key Sub-components:**
# Location selection and GIS mapping module
# Satellite data acquisition and preprocessing module
# Hybrid ML prediction engine
# Frontend visualization and user interaction layer

**Technologies:**
# Backend: Flask (Python)
# Machine Learning: Scikit-learn, XGBoost
# Data Sources: NASA POWER API
# Frontend: React.js

**Location:** `Location_Aware_Model/ `

## Installation & Run Instructions

### Backend (Flask API)

```bash
cd Location_Aware_Model/backend
pip install -r requirements.txt
python app.py
```

---

### Frontend (React.js Web App)

```bash
cd Location_Aware_Model/frontend
npm install
npm start
```

---

## Project Structure

```
SmartSolarAdvisor_25-26J-527/
├── Location_Aware_Model/      # Monthly Unit Prediction System
│   ├── backend/               # Flask API with ML models
│   └── frontend/              # React.js dashboard
│
├── FaultDetection/            # Anomaly Fault Detection Module
│   ├── backend/               # Node.js API
│   ├── frontend/              # React.js dashboard
│   └── ml-service/            # Python ML service
│
├── Chatbot/                   # LLM-Powered Solar Chatbot
│   ├── src/                   # RAG system implementation
│   └── data/                  # Knowledge base
│
└── SmartSolarUnit/            # Nearby Site-Based Forecasting
    ├── Arduino_System/        # ESP32 IoT sensors
    ├── solar_python_engine/   # ML prediction engine
    ├── SmartSolar_Backend/    # Node.js API
    ├── SmartSolar_WebApp/     # React web dashboard
    └── SmartSolarApp/         # React Native mobile app
```

---

## Getting Started

Each component has its own setup instructions. Please refer to the individual README files in each component directory for detailed installation and running instructions.

### Quick Start Links

- **Monthly Prediction System:** See `Location_Aware_Model/README.md`
- **Fault Detection:** See `FaultDetection/frontend/README.md`
- **Chatbot:** See `Chatbot/README.md`
- **Real-time Forecasting:** See `SmartSolarUnit/SmartSolar_WebApp/` and `SmartSolarUnit/SmartSolarApp/README.md`

---

## Technologies Overview

- **Machine Learning:** XGBoost, Scikit-learn, Random Forest
- **IoT & Hardware:** ESP32, Arduino, Sensor Networks
- **Backend:** Node.js, Python (Flask)
- **Frontend:** React.js, React Native, TypeScript
- **Databases:** Firebase, MongoDB, SQLite
- **AI/LLM:** LangChain, OpenAI GPT, RAG
- **APIs:** NASA POWER, Weather APIs

---

## Contributors

**Project ID:** 25-26J-527

---

## License

[Add your license information here]

---

## Acknowledgments

This project integrates multiple advanced technologies to provide a comprehensive solar energy management solution for Sri Lanka.
