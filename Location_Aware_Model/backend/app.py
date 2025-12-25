from flask import Flask
from flask_cors import CORS
from api.routes import create_api
from config import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Enable CORS
    CORS(app)
    
    # Register API blueprint
    api = create_api()
    app.register_blueprint(api, url_prefix='/api')
    
    @app.route('/')
    def index():
        return {
            'message': 'Smart Solar Advisor API',
            'version': '1.0.0',
            'endpoints': [
                '/api/predict',
                '/api/weather',
                '/api/nearby-installations',
                '/api/simulate-scenario'
            ]
        }
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)