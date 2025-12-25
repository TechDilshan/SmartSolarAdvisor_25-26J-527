import numpy as np
import pandas as pd
from datetime import datetime

class FeatureEngineer:
    """Feature engineering for solar prediction"""
    
    def __init__(self):
        self.feature_names = []
    
    def create_features(self, df):
        """Create features from raw data"""
        df = df.copy()
        
        # Time-based features
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'])
            df['month'] = df['date'].dt.month
            df['day_of_year'] = df['date'].dt.dayofyear
            df['season'] = df['month'].apply(self._get_season)
        
        # Solar angle calculations
        if 'latitude' in df.columns and 'day_of_year' in df.columns:
            df['solar_declination'] = self._calculate_solar_declination(df['day_of_year'])
            df['hour_angle'] = self._calculate_hour_angle(df.get('hour', 12))
            df['solar_elevation'] = self._calculate_solar_elevation(
                df['latitude'], 
                df['solar_declination'], 
                df['hour_angle']
            )
        
        # Roof orientation features
        if 'roof_orientation' in df.columns:
            df['orientation_factor'] = df['roof_orientation'].apply(self._orientation_factor)
        
        # Temperature effects
        if 'temperature' in df.columns:
            df['temp_efficiency_loss'] = (df['temperature'] - 25) * 0.004  # 0.4% loss per degree above 25°C
        
        # Interaction features
        if 'irradiance' in df.columns and 'roof_angle' in df.columns:
            df['effective_irradiance'] = df['irradiance'] * np.cos(np.radians(df['roof_angle']))
        
        # Shading impact
        if 'shading_factor' in df.columns:
            df['shading_loss'] = 1 - df['shading_factor']
        
        self.feature_names = [col for col in df.columns if col not in ['date', 'solar_output']]
        
        return df
    
    def _get_season(self, month):
        """Get season from month (Northern Hemisphere)"""
        if month in [12, 1, 2]:
            return 0  # Winter
        elif month in [3, 4, 5]:
            return 1  # Spring
        elif month in [6, 7, 8]:
            return 2  # Summer
        else:
            return 3  # Fall
    
    def _calculate_solar_declination(self, day_of_year):
        """Calculate solar declination angle"""
        return 23.45 * np.sin(np.radians(360 * (284 + day_of_year) / 365))
    
    def _calculate_hour_angle(self, hour):
        """Calculate hour angle"""
        return 15 * (hour - 12)
    
    def _calculate_solar_elevation(self, latitude, declination, hour_angle):
        """Calculate solar elevation angle"""
        lat_rad = np.radians(latitude)
        dec_rad = np.radians(declination)
        ha_rad = np.radians(hour_angle)
        
        elevation = np.arcsin(
            np.sin(lat_rad) * np.sin(dec_rad) + 
            np.cos(lat_rad) * np.cos(dec_rad) * np.cos(ha_rad)
        )
        return np.degrees(elevation)
    
    def _orientation_factor(self, orientation):
        """Calculate orientation efficiency factor"""
        orientation_map = {
            'south': 1.0,
            'southeast': 0.95,
            'southwest': 0.95,
            'east': 0.85,
            'west': 0.85,
            'northeast': 0.75,
            'northwest': 0.75,
            'north': 0.6
        }
        return orientation_map.get(orientation.lower(), 0.8)