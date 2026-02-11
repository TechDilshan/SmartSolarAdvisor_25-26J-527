import os
from datetime import timedelta

class Config:
    """Application configuration settings"""
    # Flask secret key (used for sessions & security)
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
        
    # MongoDB connection string and database name
    # Hard-code Atlas connection to ensure we don't fall back to localhost.
    # If you want to move this back to .env later, replace this with
    # os.environ.get('MONGODB_URI') or similar.
    MONGO_URI = "mongodb+srv://it22341204_db_user:Malmi123@cluster0.t52vj80.mongodb.net/?appName=Cluster0"
    MONGO_DB_NAME = os.environ.get('MONGO_DB_NAME') or 'smart_solar_advisor'
    
    # Secret key for secure user authentication (JWT Token)
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key-change-in-production'
    
    # JWT token expiry time
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    
    # Folder to store uploaded files
    UPLOAD_FOLDER = 'data'

    # Maximum upload size (16 MB)
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


class TestingConfig(Config):
    TESTING = True
    DEBUG = False


def get_config(name: str):
    """
    Return a config class for Flask's `app.config.from_object(...)`.
    """
    if not name:
        return DevelopmentConfig

    name_lc = str(name).lower()
    if name_lc in ("prod", "production"):
        return ProductionConfig
    if name_lc in ("test", "testing"):
        return TestingConfig
    # default
    return DevelopmentConfig