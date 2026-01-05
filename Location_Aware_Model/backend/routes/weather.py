from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import requests
import os
from datetime import datetime
import math

weather_bp = Blueprint('weather', __name__)

OPENWEATHER_API_KEY = os.environ.get('OPENWEATHER_API_KEY', '')

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
        
        # get real-time data from OpenWeatherMap
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

def calculate_solar_irradiance(lat, lon, cloud_coverage, elevation=0):
    """
    Calculate daily solar irradiance (kWh/m²/day) using improved formula
    Based on location, date, elevation, and cloud coverage
    """
    # Current date
    now = datetime.utcnow()
    day_of_year = now.timetuple().tm_yday
    
    # Solar declination angle (degrees)
    declination = 23.45 * math.sin(math.radians(360 * (284 + day_of_year) / 365))
    
    # Convert to radians
    lat_rad = math.radians(lat)
    dec_rad = math.radians(declination)
    
    # Sunrise/sunset hour angle
    hour_angle = math.acos(-math.tan(lat_rad) * math.tan(dec_rad))
    
    # Day length in hours
    day_length = 2 * hour_angle * 12 / math.pi
    
    # Extraterrestrial solar radiation (W/m²)
    solar_constant = 1367
    
    # Average daily extraterrestrial radiation (Wh/m²/day)
    cos_lat = math.cos(lat_rad)
    cos_dec = math.cos(dec_rad)
    sin_lat = math.sin(lat_rad)
    sin_dec = math.sin(dec_rad)
    
    # Daily extraterrestrial radiation (Wh/m²/day)
    h0 = (24 * solar_constant / math.pi) * (
        cos_lat * cos_dec * math.sin(hour_angle) +
        hour_angle * sin_lat * sin_dec
    )
    
    # Convert to kWh/m²/day
    h0_kwh = h0 / 1000
    
    # Atmospheric transmittance factors
    # Clear sky transmittance (typical values: 0.6-0.7 for clear days)
    clear_sky_transmittance = 0.65
    
    # Elevation correction (higher elevation = less atmosphere = more irradiance)
    # Rough approximation: +1% per 100m elevation
    elevation_factor = 1 + (elevation / 10000)
    
    # Clear sky irradiance
    clear_sky_irradiance = h0_kwh * clear_sky_transmittance * elevation_factor
    
    # Cloud coverage reduction
    # More realistic: clouds reduce irradiance by 60-80% depending on type
    cloud_reduction = 0.7  # 70% reduction for full cloud coverage
    cloud_factor = 1 - (cloud_coverage / 100.0 * cloud_reduction)
    
    # Final solar irradiance
    solar_irradiance = clear_sky_irradiance * cloud_factor
    
    # Clamp to reasonable values (1-8 kWh/m²/day)
    solar_irradiance = max(1.0, min(8.0, solar_irradiance))
    
    return round(solar_irradiance, 2)

def fetch_openweather_data(lat, lon):
    """
    Fetch real-time weather data from OpenWeatherMap API
    """
    try:
        # Check if API key is provided
        if not OPENWEATHER_API_KEY or OPENWEATHER_API_KEY.strip() == '':
            print("OpenWeatherMap API key not configured")
            return None
        
        url = f"https://api.openweathermap.org/data/2.5/weather"
        params = {
            'lat': lat,
            'lon': lon,
            'appid': OPENWEATHER_API_KEY,
            'units': 'metric'
        }
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            # Extract weather data
            temp = data['main']['temp']
            humidity = data['main']['humidity']
            wind_speed = data.get('wind', {}).get('speed', 0)
            cloud_coverage = data.get('clouds', {}).get('all', 0)
            pressure = data['main'].get('pressure', 1013)
            
            # Get elevation if available (from weather station or geocoding)
            elevation = 0  # Default, can be enhanced with elevation API
            
            # Calculate accurate solar irradiance
            solar_irradiance = calculate_solar_irradiance(lat, lon, cloud_coverage, elevation)
            
            # Location name
            location_name = data.get('name', 'Unknown')
            country = data.get('sys', {}).get('country', '')
            if country:
                location_name = f"{location_name}, {country}"
            
            return {
                'location': location_name,
                'temperature': round(temp, 1),
                'humidity': round(humidity, 1),
                'wind_speed': round(wind_speed, 1),
                'solar_irradiance': solar_irradiance,
                'cloud_coverage': round(cloud_coverage, 1),
                'pressure': round(pressure, 1),
                'timestamp': datetime.utcnow().isoformat(),
                'source': 'OpenWeatherMap'
            }
        elif response.status_code == 401:
            print(f"OpenWeatherMap API authentication failed - Invalid API key")
            return None
        elif response.status_code == 429:
            print(f"OpenWeatherMap API rate limit exceeded")
            return None
        else:
            print(f"OpenWeatherMap API error: {response.status_code} - {response.text}")
            return None
    
    except requests.exceptions.Timeout:
        print("OpenWeatherMap API request timeout")
        return None
    except requests.exceptions.RequestException as e:
        print(f"OpenWeatherMap API request error: {e}")
        return None
    except Exception as e:
        print(f"Error processing OpenWeatherMap data: {e}")
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
            solar_irradiance = calculate_solar_irradiance(lat, lon, 50.0, elevation_estimate if 'elevation_estimate' in locals() else 0)
    else:
        # Generic estimation for non-Sri Lanka locations
        location_name = f"Lat: {lat:.4f}, Lon: {lon:.4f}"
        lat_abs = abs(lat)
        if lat_abs < 10:
            base_temp = 28 + (lat_abs - 5) * 0.5  # Tropical
            humidity = 75 + (lat_abs - 5) * 1.0
        elif lat_abs < 30:
            base_temp = 22 + (lat_abs - 15) * 0.3  # Subtropical
            humidity = 65 + (lat_abs - 15) * 0.5
        elif lat_abs < 50:
            base_temp = 15 + (lat_abs - 35) * 0.2  # Temperate
            humidity = 60 + (lat_abs - 35) * 0.3
        else:
            base_temp = 5 + (lat_abs - 50) * 0.1   # Polar
            humidity = 55 + (lat_abs - 50) * 0.2
        
        # Calculate solar irradiance using improved formula (assuming 50% cloud coverage)
        solar_irradiance = calculate_solar_irradiance(lat, lon, 50.0, 0)
    
    # Add seasonal variation for temperature (solar irradiance already accounts for season)
    month = datetime.utcnow().month
    if 11 <= month or month <= 2:  # Nov-Feb (winter in northern hemisphere)
        if lat > 0:
            base_temp -= 2
    elif 6 <= month <= 8:  # Jun-Aug (summer)
        if lat > 0:
            base_temp += 3
    
    # Ensure reasonable bounds
    base_temp = max(5, min(35, base_temp))
    humidity = max(40, min(95, humidity))
    
    # Initialize location_name if not set
    if 'location_name' not in locals():
        location_name = f"Lat: {lat:.4f}, Lon: {lon:.4f}"
    
    return {
        'location': location_name,
        'temperature': round(base_temp, 1),
        'humidity': round(humidity, 1),
        'wind_speed': 3.5,
        'solar_irradiance': solar_irradiance,
        'cloud_coverage': 50.0,
        'pressure': 1013.0,
        'timestamp': datetime.utcnow().isoformat(),
        'source': 'Estimated'
    }

def fetch_weather_forecast(lat, lon):
    """
    Fetch weather forecast data from OpenWeatherMap API
    """
    try:
        # Check if API key is provided
        if not OPENWEATHER_API_KEY or OPENWEATHER_API_KEY.strip() == '':
            return {'forecast': [], 'message': 'OpenWeatherMap API key not configured'}
        
        url = f"https://api.openweathermap.org/data/2.5/forecast"
        params = {
            'lat': lat,
            'lon': lon,
            'appid': OPENWEATHER_API_KEY,
            'units': 'metric'
        }
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            forecast = []
            
            for item in data.get('list', [])[:5]:  # Next 5 forecasts
                cloud_coverage = item.get('clouds', {}).get('all', 0)
                solar_irradiance = calculate_solar_irradiance(lat, lon, cloud_coverage)
                
                forecast.append({
                    'datetime': item['dt_txt'],
                    'temperature': round(item['main']['temp'], 1),
                    'humidity': round(item['main']['humidity'], 1),
                    'wind_speed': round(item.get('wind', {}).get('speed', 0), 1),
                    'cloud_coverage': round(cloud_coverage, 1),
                    'solar_irradiance': solar_irradiance
                })
            
            return {'forecast': forecast}
        elif response.status_code == 401:
            return {'forecast': [], 'error': 'Invalid API key'}
        elif response.status_code == 429:
            return {'forecast': [], 'error': 'API rate limit exceeded'}
        else:
            return {'forecast': [], 'error': f'API error: {response.status_code}'}
    
    except requests.exceptions.Timeout:
        return {'forecast': [], 'error': 'Request timeout'}
    except Exception as e:
        print(f"Error fetching forecast: {e}")
        return {'forecast': [], 'error': str(e)}

