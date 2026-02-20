from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# ✅ Load trained model correctly
model = joblib.load("best_rf_model1.pkl")

@app.route("/predict", methods=["POST"])
def predict():
    """Predict solar system production based on weather data"""
    try:
        data = request.json

        features = np.array([[ 
            data["Hour"],
            data["Day"],
            data["Month"],
            data["WindSpeed"],
            data["Sunshine"],
            data["AirPressure"],
            data["Radiation"],
            data["AirTemperature"],
            data["RelativeAirHumidity"]
        ]])

        prediction = model.predict(features)

        return jsonify({
            "success": True,
            "predictedSystemProduction": float(prediction[0])
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400

@app.route("/detect-fault", methods=["POST"])
def detect_fault():
    """Detect faults by comparing predicted vs actual production"""
    try:
        data = request.json
        
        # Extract features for prediction
        features = np.array([[ 
            data["Hour"],
            data["Day"],
            data["Month"],
            data["WindSpeed"],
            data["Sunshine"],
            data["AirPressure"],
            data["Radiation"],
            data["AirTemperature"],
            data["RelativeAirHumidity"]
        ]])

        # Get predicted production
        predicted_production = float(model.predict(features)[0])
        actual_production = float(data.get("actualProduction", 0))
        
        # Calculate deviation percentage
        if predicted_production > 0:
            deviation = ((actual_production - predicted_production) / predicted_production) * 100
        else:
            deviation = 0
        
        # Determine fault status
        fault_detected = False
        fault_type = "none"
        fault_severity = "none"
        
        # Fault detection logic
        if actual_production < predicted_production * 0.7:  # 30% below prediction
            fault_detected = True
            fault_severity = "high"
            
            # Determine fault type based on conditions
            if data.get("AirTemperature", 0) > 40:
                fault_type = "overheating"
            elif data.get("Radiation", 0) < 50:
                fault_type = "low_radiation"
            elif data.get("Sunshine", 0) < 20:
                fault_type = "low_radiation"
            else:
                fault_type = "low_production"
        elif actual_production < predicted_production * 0.85:  # 15% below prediction
            fault_detected = True
            fault_severity = "medium"
            fault_type = "low_production"
        elif actual_production < predicted_production * 0.95:  # 5% below prediction
            fault_detected = True
            fault_severity = "low"
            fault_type = "low_production"
        
        return jsonify({
            "success": True,
            "prediction": {
                "predictedProduction": predicted_production,
                "actualProduction": actual_production,
                "faultDetected": fault_detected,
                "faultType": fault_type,
                "faultSeverity": fault_severity,
                "deviation": round(deviation, 2)
            }
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400

@app.route("/forecast", methods=["POST"])
def forecast():
    """Forecast production for next N hours"""
    try:
        data = request.json
        hours_ahead = int(data.get("hoursAhead", 24))
        
        # Get current time
        now = datetime.now()
        
        forecasts = []
        
        for i in range(hours_ahead):
            future_time = now + timedelta(hours=i)
            
            # Use provided weather forecast or estimate
            weather_data = data.get("weatherForecast", [])
            
            if i < len(weather_data):
                weather = weather_data[i]
            else:
                # Simple estimation if no forecast provided
                hour = future_time.hour
                day = future_time.day
                month = future_time.month
                
                # Estimate weather based on time of day
                if 6 <= hour <= 18:  # Daytime
                    sunshine = 50 + (hour - 6) * 3 if hour <= 12 else 50 + (18 - hour) * 3
                    radiation = sunshine * 2
                    air_temp = 25 + (hour - 6) * 1.5 if hour <= 14 else 25 + (18 - hour) * 1.5
                else:  # Nighttime
                    sunshine = 0
                    radiation = 0
                    air_temp = 20
                
                weather = {
                    "Hour": hour,
                    "Day": day,
                    "Month": month,
                    "WindSpeed": data.get("currentWindSpeed", 10),
                    "Sunshine": sunshine,
                    "AirPressure": data.get("currentAirPressure", 1010),
                    "Radiation": radiation,
                    "AirTemperature": air_temp,
                    "RelativeAirHumidity": data.get("currentHumidity", 60)
                }
            
            # Predict production
            features = np.array([[ 
                weather["Hour"],
                weather["Day"],
                weather["Month"],
                weather["WindSpeed"],
                weather["Sunshine"],
                weather["AirPressure"],
                weather["Radiation"],
                weather["AirTemperature"],
                weather["RelativeAirHumidity"]
            ]])
            
            predicted = float(model.predict(features)[0])
            
            forecasts.append({
                "timestamp": future_time.isoformat(),
                "hour": future_time.hour,
                "predictedProduction": round(predicted, 2),
                "weather": weather
            })
        
        return jsonify({
            "success": True,
            "forecasts": forecasts
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "success": True,
        "status": "ML Service is running",
        "model_loaded": model is not None
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002, debug=True)
