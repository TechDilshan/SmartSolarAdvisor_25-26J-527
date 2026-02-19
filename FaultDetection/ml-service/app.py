from flask import Flask, request, jsonify
import joblib
import numpy as np

app = Flask(__name__)

# ✅ Load trained model correctly
model = joblib.load("best_rf_model1.pkl")

@app.route("/predict", methods=["POST"])
def predict():
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
        "predictedSystemProduction": float(prediction[0])
    })

if __name__ == "__main__":
    app.run(port=5001, debug=True)
