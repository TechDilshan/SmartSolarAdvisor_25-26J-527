import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # API Configuration
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    
    # Model Configuration
    MODEL_PATH = os.getenv('MODEL_PATH', 'models/saved_models/')
    HYBRID_MODEL_FILE = 'hybrid_solar_model.pkl'
    ANOMALY_MODEL_FILE = 'anomaly_detector.pkl'
    SCALER_FILE = 'feature_scaler.pkl'
    
    # Data Configuration
    DATA_PATH = 'data/datasets/'
    CACHE_TIMEOUT = 3600  # 1 hour
    
    # External APIs
    OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY', '')
    NASA_POWER_API = 'https://power.larc.nasa.gov/api/temporal/daily/point'
    
    # Model Parameters
    ENSEMBLE_WEIGHTS = {
        'xgboost': 0.4,
        'lightgbm': 0.3,
        'neural_network': 0.3
    }
    
    # Feature Engineering
    FEATURE_COLUMNS = [
        'solar_irradiance', 'temperature', 'humidity', 'wind_speed',
        'cloud_cover', 'pressure', 'day_of_year', 'hour_of_day',
        'panel_efficiency', 'panel_area', 'tilt_angle', 'azimuth_angle',
        'latitude', 'longitude', 'elevation'
    ]
    
    # Anomaly Detection
    ANOMALY_THRESHOLD = 0.95
    
    # Optimization
    MAX_WORKERS = 4
    BATCH_SIZE = 32