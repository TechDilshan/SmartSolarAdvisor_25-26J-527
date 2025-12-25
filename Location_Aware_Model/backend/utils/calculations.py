import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import pvlib

class SolarCalculations:
    """
    Solar energy calculations and estimations.
    """
    
    # Standard test conditions
    STC_IRRADIANCE = 1000  # W/m²
    STC_TEMPERATURE = 25   # °C
    
    def __init__(self):
        pass
    
    def calculate_panel_output(self,
                              irradiance: float,
                              panel_area: float,
                              efficiency: float,
                              temperature: float = 25) -> float:
        """
        Calculate solar panel power output.
        
        Args:
            irradiance: Solar irradiance in W/m²
            panel_area: Panel area in m²
            efficiency: Panel efficiency (0-1)
            temperature: Panel temperature in °C
            
        Returns:
            Power output in kW
        """
        # Temperature coefficient (typical value)
        temp_coefficient = -0.004  # per °C
        
        # Temperature correction
        temp_correction = 1 + temp_coefficient * (temperature - self.STC_TEMPERATURE)
        
        # Power output
        power = (irradiance * panel_area * efficiency * temp_correction) / 1000
        
        return max(0, power)
    
    def estimate_daily_production(self,
                                  peak_sun_hours: float,
                                  system_size: float,
                                  system_losses: float = 0.15) -> float:
        """
        Estimate daily solar energy production.
        
        Args:
            peak_sun_hours: Daily peak sun hours
            system_size: System size in kW
            system_losses: System losses (0-1)
            
        Returns:
            Daily energy production in kWh
        """
        return peak_sun_hours * system_size * (1 - system_losses)
    
    def estimate_monthly_production(self,
                                   latitude: float,
                                   system_size: float,
                                   month: int,
                                   system_losses: float = 0.15) -> float:
        """
        Estimate monthly solar energy production.
        
        Args:
            latitude: Location latitude
            system_size: System size in kW
            month: Month number (1-12)
            system_losses: System losses (0-1)
            
        Returns:
            Monthly energy production in kWh
        """
        # Typical peak sun hours by latitude and month (simplified)
        base_hours = 4.0
        seasonal_factor = 1 + 0.3 * np.sin(2 * np.pi * (month - 3) / 12)
        latitude_factor = 1 - abs(latitude) / 90 * 0.3
        
        peak_sun_hours = base_hours * seasonal_factor * latitude_factor
        
        # Days in month
        days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
        
        daily_production = self.estimate_daily_production(
            peak_sun_hours, system_size, system_losses
        )
        
        return daily_production * days_in_month
    
    def estimate_annual_production(self,
                                  latitude: float,
                                  system_size: float,
                                  system_losses: float = 0.15) -> float:
        """
        Estimate annual solar energy production.
        
        Args:
            latitude: Location latitude
            system_size: System size in kW
            system_losses: System losses (0-1)
            
        Returns:
            Annual energy production in kWh
        """
        annual_production = sum(
            self.estimate_monthly_production(latitude, system_size, month, system_losses)
            for month in range(1, 13)
        )
        
        return annual_production
    
    def calculate_roi(self,
                     system_cost: float,
                     annual_production: float,
                     electricity_rate: float,
                     annual_increase: float = 0.03,
                     system_lifetime: int = 25) -> Dict:
        """
        Calculate return on investment for solar system.
        
        Args:
            system_cost: Total system cost in currency units
            annual_production: Annual energy production in kWh
            electricity_rate: Current electricity rate per kWh
            annual_increase: Annual electricity rate increase
            system_lifetime: System lifetime in years
            
        Returns:
            Dictionary with ROI metrics
        """
        cumulative_savings = 0
        payback_year = None
        
        yearly_savings = []
        
        for year in range(1, system_lifetime + 1):
            # Account for panel degradation (0.5% per year typical)
            degradation_factor = (1 - 0.005) ** (year - 1)
            
            # Adjust electricity rate
            current_rate = electricity_rate * (1 + annual_increase) ** (year - 1)
            
            # Calculate savings
            annual_savings = annual_production * degradation_factor * current_rate
            cumulative_savings += annual_savings
            yearly_savings.append(annual_savings)
            
            # Check payback
            if payback_year is None and cumulative_savings >= system_cost:
                payback_year = year
        
        total_lifetime_savings = cumulative_savings - system_cost
        roi_percentage = (total_lifetime_savings / system_cost) * 100
        
        return {
            'payback_period_years': payback_year,
            'total_lifetime_savings': total_lifetime_savings,
            'roi_percentage': roi_percentage,
            'yearly_savings': yearly_savings,
            'cumulative_savings': cumulative_savings
        }
    
    def calculate_carbon_offset(self,
                           annual_production: float,
                           grid_carbon_intensity: float = 0.5) -> Dict:
    """
    Calculate carbon emissions offset by solar system.
    
    Args:
        annual_production: Annual energy production in kWh
        grid_carbon_intensity: Grid carbon intensity in kg CO2/kWh
        
    Returns:
        Dictionary with carbon offset metrics
    """
    annual_offset = annual_production * grid_carbon_intensity
    
    # Equivalent metrics
    trees_equivalent = annual_offset / 21  # 1 tree absorbs ~21 kg CO2/year
    car_miles_equivalent = annual_offset / 0.411  # 0.411 kg CO2 per mile
    
    return {
        'annual_co2_offset_kg': annual_offset,
        'annual_co2_offset_tons': annual_offset / 1000,
        'trees_equivalent': trees_equivalent,
        'car_miles_equivalent': car_miles_equivalent
    }

def optimize_system_size(self,
                        monthly_consumption: List[float],
                        latitude: float,
                        max_budget: float,
                        cost_per_kw: float = 2500) -> Dict:
    """
    Optimize solar system size based on consumption and budget.
    
    Args:
        monthly_consumption: List of 12 monthly consumption values in kWh
        latitude: Location latitude
        max_budget: Maximum budget
        cost_per_kw: Cost per kW of system capacity
        
    Returns:
        Dictionary with optimization results
    """
    annual_consumption = sum(monthly_consumption)
    
    # Calculate maximum affordable system size
    max_size = max_budget / cost_per_kw
    
    # Calculate required size to meet 100% of consumption
    required_annual_production = annual_consumption
    
    # Iteratively find optimal size
    optimal_size = 0
    for size in np.arange(1, max_size + 0.5, 0.5):
        production = self.estimate_annual_production(latitude, size)
        if production >= required_annual_production:
            optimal_size = size
            break
    
    if optimal_size == 0:
        optimal_size = max_size
    
    # Calculate metrics for optimal size
    production = self.estimate_annual_production(latitude, optimal_size)
    coverage_percentage = (production / annual_consumption) * 100
    system_cost = optimal_size * cost_per_kw
    
    return {
        'optimal_size_kw': optimal_size,
        'estimated_annual_production_kwh': production,
        'annual_consumption_kwh': annual_consumption,
        'coverage_percentage': coverage_percentage,
        'system_cost': system_cost,
        'cost_per_kwh': system_cost / production if production > 0 else 0
    }