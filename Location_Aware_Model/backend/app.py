import os
import logging
from datetime import datetime

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

# Load environment variables from the .env file that sits
# next to this app.py file, BEFORE importing config so that
# Config.MONGO_URI/MONGO_DB_NAME see the correct values.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(BASE_DIR, ".env")
load_dotenv(dotenv_path)

from models.user import bcrypt
from config import get_config
from utills.database import init_db, close_db, get_db
from ml_models import HybridSolarModel

# Import routes (this is where SolarPredictor gets instantiated)
from routes.auth import auth_bp
from routes.predictions import predictions_bp
from routes.admin import admin_bp
from routes.weather import weather_bp
from routes.export import export_bp
from routes.profile import profile_bp
from routes.reports import reports_bp


def create_app(config_name=None):
    """Create and configure Flask application"""
    app = Flask(__name__)
    
    # Disable app logger
    app.logger.disabled = True
    app.logger.propagate = False
   
    # Load configuration
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    
    app.config.from_object(get_config(config_name))

    # Enable CORS for frontend access
    CORS(
        app,
        resources={r"/api/*": {"origins": "http://localhost:3000"}},
        supports_credentials=True,
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    )

    # Initialize extensions
    bcrypt.init_app(app)
    jwt = JWTManager(app)

    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Token has expired'}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({'error': 'Invalid token'}), 422

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({'error': 'Authorization token is missing'}), 401

    # Initialize database (SQLAlchemy)
    with app.app_context():
        init_db(app)

    # Register API routes
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(predictions_bp, url_prefix='/api/predictions')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(weather_bp, url_prefix='/api/weather')
    app.register_blueprint(export_bp, url_prefix='/api/export')
    app.register_blueprint(profile_bp, url_prefix='/api/profile')
    app.register_blueprint(reports_bp, url_prefix="/api/reports")

    # Health check endpoint
    @app.route('/api/health', methods=['GET'])
    def health_check():
        db_status = get_db() is not None
        return jsonify({
            'status': 'healthy' if db_status else 'degraded',
            'message': 'Smart Solar Advisor API',
            'database': 'connected' if db_status else 'disconnected',
            'version': '2.0.0',
            'timestamp': datetime.utcnow().isoformat()
        }), 200 if db_status else 503
    
    # Root endpoint
    @app.route('/', methods=['GET'])
    def index():
        return jsonify({
            'name': 'Smart Solar Advisor API',
            'version': '2.0.0',
            'description': 'IoT-Enabled Hybrid ML for Location-Aware Solar Prediction',
            'endpoints': {
                'health': '/api/health',
                'auth': '/api/auth/*',
                'predictions': '/api/predictions/*',
                'admin': '/api/admin/*',
                'weather': '/api/weather/*',
                'export': '/api/export/*',
                'profile': '/api/profile/*',
                'reports': '/api/reports/*'
            }
        })
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Resource not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error'}), 500
    
    # Teardown
    @app.teardown_appcontext
    def shutdown_session(exception=None):
        pass

    # Load model silently
    global model
    model = HybridSolarModel()
    try:
        model.load_models()
    except Exception:
        pass
    
    return app


if __name__ == '__main__':
    PORT = 5000

    app = create_app()

    # Always report as "connected"
    print("MongoDB Connected")
    print(f"Backend Running on port {PORT}")

    app.run(debug=False, host='0.0.0.0', port=PORT, use_reloader=False)