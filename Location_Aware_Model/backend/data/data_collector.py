import pandas as pd
import requests
import os
from config import Config

class DataCollector:
    """Collect data from various sources"""
    
    def __init__(self):
        self.config = Config()
    
    def load_csv_dataset(self, filepath):
        """Load solar data from CSV file"""
        try:
            df = pd.read_csv(filepath)
            print(f"Loaded dataset with shape: {df.shape}")
            print(f"Columns: {df.columns.tolist()}")
            return df
        except Exception as e:
            print(f"Error loading CSV: {e}")
            return None
    
    def get_weather_data(self, latitude, longitude):
        """Fetch real-time weather data from OpenWeatherMap"""
        try:
            url = f"http://api.openweathermap.org/data/2.5/weather"
            params = {
                'lat': latitude,
                'lon': longitude,
                'appid': self.config.OPENWEATHER_API_KEY,
                'units': 'metric'
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            weather_data = {
                'temperature': data['main']['temp'],
                'humidity': data['main']['humidity'],
                'pressure': data['main']['pressure'],
                'wind_speed': data['wind']['speed'],
                'clouds': data['clouds']['all'],
                'weather_condition': data['weather'][0]['main']
            }
            
            return weather_data
        
        except Exception as e:
            print(f"Error fetching weather data: {e}")
            return {
                'temperature': 28,
                'humidity': 75,
                'pressure': 1013,
                'wind_speed': 3.5,
                'clouds': 40,
                'weather_condition': 'Clear'
            }
    
    def get_nasa_power_data(self, latitude, longitude, start_date, end_date):
        """Fetch solar irradiance data from NASA POWER (mock implementation)"""
        # Note: Actual NASA POWER API requires specific formatting
        # This is a simplified version
        print(f"Fetching NASA POWER data for ({latitude}, {longitude})")
        
        # Mock data for demonstration
        return {
            'irradiance': 5.5,  # kWh/m²/day
            'clearness_index': 0.65
        }