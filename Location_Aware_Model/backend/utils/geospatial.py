import numpy as np
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
from typing import Tuple, Optional, Dict
import time

class GeospatialUtils:
    """
    Utility functions for geospatial calculations.
    """
    
    def __init__(self):
        self.geolocator = Nominatim(user_agent="smart_solar_advisor")
    
    def geocode_address(self, address: str) -> Optional[Tuple[float, float]]:
        """
        Convert address to coordinates.
        
        Args:
            address: Address string
            
        Returns:
            Tuple of (latitude, longitude) or None
        """
        try:
            time.sleep(1)  # Respect rate limits
            location = self.geolocator.geocode(address)
            if location:
                return (location.latitude, location.longitude)
            return None
        except Exception as e:
            print(f"Geocoding error: {e}")
            return None
    
    def reverse_geocode(self, latitude: float, longitude: float) -> Optional[str]:
        """
        Convert coordinates to address.
        
        Args:
            latitude: Latitude
            longitude: Longitude
            
        Returns:
            Address string or None
        """
        try:
            time.sleep(1)  # Respect rate limits
            location = self.geolocator.reverse(f"{latitude}, {longitude}")
            if location:
                return location.address
            return None
        except Exception as e:
            print(f"Reverse geocoding error: {e}")
            return None
    
    def calculate_distance(self,
                          coord1: Tuple[float, float],
                          coord2: Tuple[float, float]) -> float:
        """
        Calculate distance between two coordinates in kilometers.
        
        Args:
            coord1: First coordinate (lat, lon)
            coord2: Second coordinate (lat, lon)
            
        Returns:
            Distance in kilometers
        """
        return geodesic(coord1, coord2).kilometers
    
    def get_timezone_offset(self, longitude: float) -> float:
        """
        Estimate timezone offset from longitude.
        
        Args:
            longitude: Longitude
            
        Returns:
            Timezone offset in hours
        """
        return longitude / 15.0
    
    def calculate_optimal_tilt(self, latitude: float) -> float:
        """
        Calculate optimal solar panel tilt angle based on latitude.
        
        Args:
            latitude: Location latitude
            
        Returns:
            Optimal tilt angle in degrees
        """
        # Rule of thumb: tilt angle = latitude
        # Can be adjusted seasonally
        return abs(latitude)
    
    def calculate_optimal_azimuth(self, latitude: float) -> float:
        """
        Calculate optimal solar panel azimuth angle.
        
        Args:
            latitude: Location latitude
            
        Returns:
            Optimal azimuth angle in degrees
        """
        # Northern hemisphere: 180° (south-facing)
        # Southern hemisphere: 0° (north-facing)
        return 180.0 if latitude >= 0 else 0.0
    
    def get_elevation_estimate(self, latitude: float, longitude: float) -> float:
        """
        Estimate elevation (simple approximation).
        
        Args:
            latitude: Location latitude
            longitude: Location longitude
            
        Returns:
            Estimated elevation in meters
        """
        # This is a simple estimation. For production, use a real elevation API
        return 0.0
    
    def get_location_info(self, latitude: float, longitude: float) -> Dict:
        """
        Get comprehensive location information.
        
        Args:
            latitude: Location latitude
            longitude: Location longitude
            
        Returns:
            Dictionary with location information
        """
        return {
            'latitude': latitude,
            'longitude': longitude,
            'address': self.reverse_geocode(latitude, longitude),
            'timezone_offset': self.get_timezone_offset(longitude),
            'optimal_tilt': self.calculate_optimal_tilt(latitude),
            'optimal_azimuth': self.calculate_optimal_azimuth(latitude),
            'elevation': self.get_elevation_estimate(latitude, longitude)
        }