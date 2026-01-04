from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import db
from models.iot_sensor import IotSensorData, AnomalyDetection
from datetime import datetime, timedelta
import numpy as np
from sklearn.ensemble import IsolationForest
import json

iot_bp = Blueprint('iot', __name__)

@iot_bp.route('/sensors', methods=['POST'])
@jwt_required()
def submit_sensor_data():
    """
    Submit IoT sensor data from rooftop sensors
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        required_fields = ['latitude', 'longitude', 'solar_irradiance', 'temperature', 'humidity']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Create sensor data entry
        sensor_data = IotSensorData(
            user_id=user_id,
            latitude=data['latitude'],
            longitude=data['longitude'],
            solar_irradiance=data['solar_irradiance'],
            temperature=data['temperature'],
            humidity=data['humidity'],
            wind_speed=data.get('wind_speed', 0),
            shading_level=data.get('shading_level', 0),
            dust_level=data.get('dust_level', 0),
            panel_voltage=data.get('panel_voltage', 0),
            panel_current=data.get('panel_current', 0)
        )
        
        db.session.add(sensor_data)
        db.session.commit()
        
        # Check for anomalies
        anomaly_result = detect_anomalies(sensor_data)
        
        return jsonify({
            'message': 'Sensor data submitted successfully',
            'sensor_data': sensor_data.to_dict(),
            'anomaly_detected': anomaly_result['is_anomaly'],
            'anomaly_score': anomaly_result['anomaly_score']
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@iot_bp.route('/sensors/<int:location_id>', methods=['GET'])
@jwt_required()
def get_sensor_data(location_id):
    """
    Get sensor data for a specific location
    """
    try:
        user_id = get_jwt_identity()
        
        # Get recent sensor data (last 24 hours)
        since = datetime.utcnow() - timedelta(hours=24)
        sensor_data = IotSensorData.query.filter(
            IotSensorData.user_id == user_id,
            IotSensorData.latitude == request.args.get('lat', type=float),
            IotSensorData.longitude == request.args.get('lon', type=float),
            IotSensorData.timestamp >= since
        ).order_by(IotSensorData.timestamp.desc()).all()
        
        return jsonify({
            'sensor_data': [s.to_dict() for s in sensor_data],
            'count': len(sensor_data)
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@iot_bp.route('/anomalies', methods=['GET'])
@jwt_required()
def get_anomalies():
    """
    Get detected anomalies for the current user
    """
    try:
        user_id = get_jwt_identity()
        
        # Get recent anomalies
        since = datetime.utcnow() - timedelta(days=7)
        anomalies = AnomalyDetection.query.filter(
            AnomalyDetection.user_id == user_id,
            AnomalyDetection.detected_at >= since
        ).order_by(AnomalyDetection.detected_at.desc()).limit(50).all()
        
        return jsonify({
            'anomalies': [a.to_dict() for a in anomalies],
            'count': len(anomalies)
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@iot_bp.route('/sensors/simulate', methods=['POST'])
@jwt_required()
def simulate_sensor_data():
    """
    Simulate IoT sensor data for testing
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        lat = data.get('latitude', 7.2)
        lon = data.get('longitude', 80.0)
        count = data.get('count', 10)
        
        simulated_data = []
        
        for i in range(count):
            # Simulate realistic sensor readings with some variation
            base_irradiance = 5.0 + np.random.normal(0, 0.5)
            base_temp = 27.0 + np.random.normal(0, 2)
            base_humidity = 75.0 + np.random.normal(0, 5)
            
            sensor_data = IotSensorData(
                user_id=user_id,
                latitude=lat,
                longitude=lon,
                solar_irradiance=max(0, base_irradiance),
                temperature=base_temp,
                humidity=max(0, min(100, base_humidity)),
                wind_speed=3.5 + np.random.normal(0, 1),
                shading_level=np.random.uniform(0, 0.2),
                dust_level=np.random.uniform(0, 0.1),
                panel_voltage=24.0 + np.random.normal(0, 1),
                panel_current=5.0 + np.random.normal(0, 0.5)
            )
            
            db.session.add(sensor_data)
            simulated_data.append(sensor_data)
        
        db.session.commit()
        
        return jsonify({
            'message': f'Simulated {count} sensor readings',
            'sensor_data': [s.to_dict() for s in simulated_data]
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def detect_anomalies(sensor_data):
    """
    Detect anomalies in sensor data using Isolation Forest
    """
    try:
        # Get recent sensor data for comparison
        since = datetime.utcnow() - timedelta(hours=24)
        recent_data = IotSensorData.query.filter(
            IotSensorData.latitude == sensor_data.latitude,
            IotSensorData.longitude == sensor_data.longitude,
            IotSensorData.timestamp >= since
        ).limit(100).all()
        
        if len(recent_data) < 5:
            # Not enough data for anomaly detection
            return {'is_anomaly': False, 'anomaly_score': 0.0}
        
        # Prepare features for anomaly detection
        features = []
        for data in recent_data:
            features.append([
                data.solar_irradiance,
                data.temperature,
                data.humidity,
                data.wind_speed
            ])
        
        # Add current sensor data
        current_features = [[
            sensor_data.solar_irradiance,
            sensor_data.temperature,
            sensor_data.humidity,
            sensor_data.wind_speed
        ]]
        
        # Train Isolation Forest
        iso_forest = IsolationForest(contamination=0.1, random_state=42)
        iso_forest.fit(features)
        
        # Predict anomaly
        prediction = iso_forest.predict(current_features)[0]
        anomaly_score = iso_forest.score_samples(current_features)[0]
        
        is_anomaly = prediction == -1
        
        # Save anomaly if detected
        if is_anomaly:
            anomaly = AnomalyDetection(
                user_id=sensor_data.user_id,
                sensor_data_id=sensor_data.id,
                anomaly_type='sensor_reading',
                anomaly_score=float(anomaly_score),
                details=json.dumps({
                    'solar_irradiance': sensor_data.solar_irradiance,
                    'temperature': sensor_data.temperature,
                    'humidity': sensor_data.humidity,
                    'wind_speed': sensor_data.wind_speed
                })
            )
            db.session.add(anomaly)
            db.session.commit()
        
        return {
            'is_anomaly': is_anomaly,
            'anomaly_score': float(anomaly_score)
        }
    
    except Exception as e:
        print(f"Error in anomaly detection: {e}")
        return {'is_anomaly': False, 'anomaly_score': 0.0}

