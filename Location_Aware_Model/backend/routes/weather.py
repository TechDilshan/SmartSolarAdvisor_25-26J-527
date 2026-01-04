from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import requests
import os
from datetime import datetime

weather_bp = Blueprint('weather', __name__)

# OpenWeatherMap API key (set in environment or use default)
OPENWEATHER_API_KEY = os.environ.get('OPENWEATHER_API_KEY', 'your_api_key_here')

@weather_bp.route('/data', methods=['GET'])
@jwt_required()
def get_weather_data():
    """
    Get real-time weather data for a location
    """
    try:
        lat_str = request.args.get('lat')
        lon_str = request.args.get('lon')
        
        if not lat_str or not lon_str:
            return jsonify({'error': 'Latitude and longitude are required'}), 400
        
        try:
            lat = float(lat_str)
            lon = float(lon_str)
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid coordinate format'}), 400
        
        # Validate coordinate ranges
        if not (-90 <= lat <= 90):
            return jsonify({'error': f'Latitude must be between -90 and 90, got {lat}'}), 400
        
        if not (-180 <= lon <= 180):
            return jsonify({'error': f'Longitude must be between -180 and 180, got {lon}'}), 400
        
        # Try to get real-time data from OpenWeatherMap
        weather_data = fetch_openweather_data(lat, lon)
        
        if not weather_data:
            # Fallback to estimated values based on location
            weather_data = estimate_weather_data(lat, lon)
        
        return jsonify(weather_data), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@weather_bp.route('/forecast', methods=['GET'])
@jwt_required()
def get_weather_forecast():
    """
    Get weather forecast for a location
    """
    try:
        lat = request.args.get('lat', type=float)
        lon = request.args.get('lon', type=float)
        
        if not lat or not lon:
            return jsonify({'error': 'Latitude and longitude are required'}), 400
        
        # Get forecast data
        forecast_data = fetch_weather_forecast(lat, lon)
        
        return jsonify(forecast_data), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def fetch_openweather_data(lat, lon):
    """
    Fetch real-time weather data from OpenWeatherMap API
    """
    try:
        if OPENWEATHER_API_KEY == 'your_api_key_here':
            return None
        
        url = f"http://api.openweathermap.org/data/2.5/weather"
        params = {
            'lat': lat,
            'lon': lon,
            'appid': OPENWEATHER_API_KEY,
            'units': 'metric'
        }
        
        response = requests.get(url, params=params, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            
            # Calculate solar irradiance estimate (simplified)
            # This is a rough estimate - in production, use dedicated solar irradiance APIs
            cloud_coverage = data.get('clouds', {}).get('all', 50) / 100.0
            temp = data['main']['temp']
            humidity = data['main']['humidity']
            
            # Estimate solar irradiance (kWh/m²/day)
            # Simplified formula - actual calculation is more complex
            base_irradiance = 5.0  # Average daily solar irradiance
            cloud_factor = 1 - (cloud_coverage * 0.6)
            solar_irradiance = base_irradiance * cloud_factor
            
            return {
                'location': f"{data['name']}, {data.get('sys', {}).get('country', '')}",
                'temperature': temp,
                'humidity': humidity,
                'wind_speed': data.get('wind', {}).get('speed', 0),
                'solar_irradiance': round(solar_irradiance, 2),
                'cloud_coverage': cloud_coverage * 100,
                'pressure': data['main'].get('pressure', 1013),
                'timestamp': datetime.utcnow().isoformat(),
                'source': 'OpenWeatherMap'
            }
    
    except Exception as e:
        print(f"Error fetching OpenWeatherMap data: {e}")
        return None

def estimate_weather_data(lat, lon):
    """
    Estimate weather data based on location (fallback)
    Uses location-specific calculations for Sri Lanka and other regions
    Accounts for elevation differences (e.g., Colombo vs Nuwara Eliya)
    """
    import math
    
    # Major Sri Lankan cities with elevation data
    # Format: (name, lat_range, lon_range, elevation_m, base_temp, humidity, solar_irradiance)
    sri_lanka_cities = [
        # Coastal cities (low elevation, warmer)
        ('Colombo', (6.8, 7.0), (79.7, 79.9), 1, 30.0, 78.0, 5.3),
        ('Galle', (6.0, 6.1), (80.2, 80.3), 5, 29.5, 80.0, 5.4),
        ('Jaffna', (9.6, 9.7), (80.0, 80.1), 5, 29.0, 75.0, 5.5),
        ('Trincomalee', (8.5, 8.6), (81.2, 81.3), 8, 29.5, 72.0, 5.6),
        # Mid-elevation cities
        ('Kandy', (7.2, 7.3), (80.6, 80.7), 500, 26.0, 80.0, 5.2),
        ('Anuradhapura', (8.3, 8.4), (80.4, 80.5), 100, 29.0, 70.0, 5.7),
        ('Polonnaruwa', (7.9, 8.0), (81.0, 81.1), 50, 28.5, 72.0, 5.6),
        # High elevation cities (cooler)
        ('Nuwara Eliya', (6.9, 7.0), (80.7, 80.8), 1880, 18.0, 85.0, 4.8),
        ('Ella', (6.8, 6.9), (81.0, 81.1), 1000, 22.0, 82.0, 5.0),
        ('Badulla', (6.9, 7.0), (81.0, 81.1), 680, 24.0, 80.0, 5.1),
    ]
    
    # Check if location matches any known Sri Lankan city
    matched_city = None
    for city_name, lat_range, lon_range, elevation, temp, hum, solar in sri_lanka_cities:
        if lat_range[0] <= lat <= lat_range[1] and lon_range[0] <= lon <= lon_range[1]:
            matched_city = (city_name, elevation, temp, hum, solar)
            break
    
    # More accurate estimation based on latitude and longitude
    # For Sri Lanka (lat ~6-10, lon ~79-82)
    if 5.5 <= lat <= 10.0 and 79.0 <= lon <= 82.0:
        if matched_city:
            # Use known city data
            city_name, elevation, base_temp, humidity, solar_irradiance = matched_city
            location_name = city_name
        else:
            # Estimate based on coordinates and elevation
            # Estimate elevation based on distance from coast and known patterns
            # Coastal areas (lon < 80.5 or lon > 81.5): low elevation
            # Central highlands (80.5 < lon < 81.5 and 6.8 < lat < 7.2): high elevation
            is_coastal = lon < 80.5 or lon > 81.5 or lat < 6.5 or lat > 9.5
            is_highland = 80.5 <= lon <= 81.5 and 6.8 <= lat <= 7.2
            
            if is_highland:
                # Central highlands - estimate elevation based on position
                # Nuwara Eliya area is highest
                elevation_estimate = 1000 + (abs(lat - 6.95) + abs(lon - 80.75)) * 200
                elevation_estimate = min(2000, max(500, elevation_estimate))
                base_temp = 18 + (2000 - elevation_estimate) / 2000 * 10  # 18-28°C range
                humidity = 82 + (2000 - elevation_estimate) / 2000 * 5
                solar_irradiance = 4.8 + (2000 - elevation_estimate) / 2000 * 0.5
            elif is_coastal:
                # Coastal areas - low elevation, warmer
                elevation_estimate = 10
                base_temp = 28 + (lat - 7) * 0.3
                humidity = 75 + (lat - 7) * 1.0
                solar_irradiance = 5.3 + (lat - 7) * 0.1
            else:
                # Mid-elevation areas
                elevation_estimate = 200
                base_temp = 26 + (lat - 7) * 0.4
                humidity = 75 + (lat - 7) * 1.2
                solar_irradiance = 5.2 + (lat - 7) * 0.15
            
            location_name = f"Lat: {lat:.4f}, Lon: {lon:.4f}"
    else:
        # Generic estimation for non-Sri Lanka locations
        location_name = f"Lat: {lat:.4f}, Lon: {lon:.4f}"
        lat_abs = abs(lat)
        if lat_abs < 10:
            base_temp = 28 + (lat_abs - 5) * 0.5  # Tropical
            humidity = 75 + (lat_abs - 5) * 1.0
            solar_irradiance = 5.5 - (lat_abs - 5) * 0.05
        elif lat_abs < 30:
            base_temp = 22 + (lat_abs - 15) * 0.3  # Subtropical
            humidity = 65 + (lat_abs - 15) * 0.5
            solar_irradiance = 5.0 - (lat_abs - 15) * 0.08
        elif lat_abs < 50:
            base_temp = 15 + (lat_abs - 35) * 0.2  # Temperate
            humidity = 60 + (lat_abs - 35) * 0.3
            solar_irradiance = 4.0 - (lat_abs - 35) * 0.06
        else:
            base_temp = 5 + (lat_abs - 50) * 0.1   # Polar
            humidity = 55 + (lat_abs - 50) * 0.2
            solar_irradiance = 2.5 - (lat_abs - 50) * 0.03
    
    # Add seasonal variation (rough estimate)
    month = datetime.utcnow().month
    if 11 <= month or month <= 2:  # Nov-Feb (winter in northern hemisphere)
        if lat > 0:
            base_temp -= 2
            solar_irradiance -= 0.3
    elif 6 <= month <= 8:  # Jun-Aug (summer)
        if lat > 0:
            base_temp += 3
            solar_irradiance += 0.5
    
    # Ensure reasonable bounds
    base_temp = max(5, min(35, base_temp))
    humidity = max(40, min(95, humidity))
    solar_irradiance = max(2.0, min(7.0, solar_irradiance))
    
    # Initialize location_name if not set
    if 'location_name' not in locals():
        location_name = f"Lat: {lat:.4f}, Lon: {lon:.4f}"
    
    return {
        'location': location_name,
        'temperature': round(base_temp, 1),
        'humidity': round(humidity, 1),
        'wind_speed': 3.5,
        'solar_irradiance': round(solar_irradiance, 2),
        'cloud_coverage': 50.0,
        'pressure': 1013.0,
        'timestamp': datetime.utcnow().isoformat(),
        'source': 'Estimated'
    }

def fetch_weather_forecast(lat, lon):
    """
    Fetch weather forecast data
    """
    try:
        if OPENWEATHER_API_KEY == 'your_api_key_here':
            return {'forecast': [], 'message': 'API key not configured'}
        
        url = f"http://api.openweathermap.org/data/2.5/forecast"
        params = {
            'lat': lat,
            'lon': lon,
            'appid': OPENWEATHER_API_KEY,
            'units': 'metric'
        }
        
        response = requests.get(url, params=params, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            forecast = []
            
            for item in data.get('list', [])[:5]:  # Next 5 forecasts
                forecast.append({
                    'datetime': item['dt_txt'],
                    'temperature': item['main']['temp'],
                    'humidity': item['main']['humidity'],
                    'wind_speed': item.get('wind', {}).get('speed', 0),
                    'cloud_coverage': item.get('clouds', {}).get('all', 0)
                })
            
            return {'forecast': forecast}
    
    except Exception as e:
        print(f"Error fetching forecast: {e}")
        return {'forecast': [], 'error': str(e)}

