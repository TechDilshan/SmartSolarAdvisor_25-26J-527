from .user import db
from datetime import datetime

class IotSensorData(db.Model):
    __tablename__ = 'iot_sensor_data'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Location
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    
    solar_irradiance = db.Column(db.Float, nullable=False)
    temperature = db.Column(db.Float, nullable=False) 
    humidity = db.Column(db.Float, nullable=False)  
    wind_speed = db.Column(db.Float, default=0)  
    
    shading_level = db.Column(db.Float, default=0) 
    dust_level = db.Column(db.Float, default=0)  
    panel_voltage = db.Column(db.Float, default=0) 
    panel_current = db.Column(db.Float, default=0)  
    
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref='sensor_data')
    anomalies = db.relationship('AnomalyDetection', backref='sensor_data', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'solar_irradiance': self.solar_irradiance,
            'temperature': self.temperature,
            'humidity': self.humidity,
            'wind_speed': self.wind_speed,
            'shading_level': self.shading_level,
            'dust_level': self.dust_level,
            'panel_voltage': self.panel_voltage,
            'panel_current': self.panel_current,
            'timestamp': self.timestamp.isoformat()
        }

class AnomalyDetection(db.Model):
    __tablename__ = 'anomaly_detections'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    sensor_data_id = db.Column(db.Integer, db.ForeignKey('iot_sensor_data.id'), nullable=True)
    
    anomaly_type = db.Column(db.String(50), nullable=False)  # 'sensor_reading', 'data_transmission', etc.
    anomaly_score = db.Column(db.Float, nullable=False)
    details = db.Column(db.Text)  # JSON string with anomaly details
    
    detected_at = db.Column(db.DateTime, default=datetime.utcnow)
    resolved = db.Column(db.Boolean, default=False)
    resolved_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    user = db.relationship('User', backref='anomalies')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'sensor_data_id': self.sensor_data_id,
            'anomaly_type': self.anomaly_type,
            'anomaly_score': self.anomaly_score,
            'details': self.details,
            'detected_at': self.detected_at.isoformat(),
            'resolved': self.resolved,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None
        }

