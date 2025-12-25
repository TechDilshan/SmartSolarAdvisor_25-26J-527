import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # API Keys
    OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY', 'your_api_key_here')
    
    # Model Configuration
    MODEL_PATH = 'models/trained_model.pkl'
    SCALER_PATH = 'models/scaler.pkl'
    
    # Data Configuration
    DATA_PATH = 'data/datasets/'
    
    # ML Model Parameters
    KNN_NEIGHBORS = 5
    XGBOOST_PARAMS = {
        'n_estimators': 100,
        'max_depth': 6,
        'learning_rate': 0.1,
        'subsample': 0.8,
        'colsample_bytree': 0.8,
        'random_state': 42
    }
    
    # Anomaly Detection
    CONTAMINATION = 0.1
    
    # Location Settings
    DEFAULT_LATITUDE = 7.2906  # Negombo, Sri Lanka
    DEFAULT_LONGITUDE = 79.8358
    
    # Cost Parameters (LKR)
    COST_PER_WATT = 200  # Installation cost per watt
    ELECTRICITY_RATE = 35  # LKR per kWh
    SYSTEM_LIFETIME_YEARS = 25
    MAINTENANCE_COST_ANNUAL = 0.01  # 1% of system cost