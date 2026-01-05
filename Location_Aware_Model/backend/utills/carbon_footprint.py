"""
Carbon Footprint Calculator for Solar Energy Systems
Calculates CO2 emissions avoided by using solar energy
"""

# Average CO2 emission factor for Sri Lanka grid electricity (kg CO2/kWh)
# Source: Based on CEB (Ceylon Electricity Board) data
SRI_LANKA_GRID_CO2_FACTOR = 0.65  # kg CO2 per kWh (2025 estimate)

# Average CO2 emission factor for global grid (kg CO2/kWh)
GLOBAL_GRID_CO2_FACTOR = 0.5  # kg CO2 per kWh (global average)

def calculate_carbon_savings(energy_kwh, country='LK'):
    """
    Calculate carbon dioxide (CO2) emissions avoided by solar energy generation
    
    Args:
        energy_kwh: Energy generated in kWh (monthly or annual)
        country: Country code ('LK' for Sri Lanka, 'GLOBAL' for global average)
    
    Returns:
        dict with:
            - co2_avoided_kg: CO2 emissions avoided in kilograms
            - co2_avoided_tonnes: CO2 emissions avoided in metric tonnes
            - trees_equivalent: Equivalent number of trees planted (1 tree absorbs ~21 kg CO2/year)
            - cars_equivalent: Equivalent cars removed from road (1 car emits ~4.6 tonnes CO2/year)
    """
    # Select appropriate CO2 factor
    if country == 'LK':
        co2_factor = SRI_LANKA_GRID_CO2_FACTOR
    else:
        co2_factor = GLOBAL_GRID_CO2_FACTOR
    
    # Calculate CO2 avoided
    co2_avoided_kg = energy_kwh * co2_factor
    co2_avoided_tonnes = co2_avoided_kg / 1000
    
    # Calculate equivalent metrics
    # Average tree absorbs ~21 kg CO2 per year
    trees_equivalent = co2_avoided_kg / 21 if co2_avoided_kg > 0 else 0
    
    # Average car emits ~4.6 tonnes CO2 per year (or ~4600 kg)
    # For monthly: divide by 12, for annual: use directly
    cars_equivalent = co2_avoided_tonnes / 4.6 if co2_avoided_tonnes > 0 else 0
    
    return {
        'co2_avoided_kg': round(co2_avoided_kg, 2),
        'co2_avoided_tonnes': round(co2_avoided_tonnes, 3),
        'trees_equivalent': round(trees_equivalent, 1),
        'cars_equivalent': round(cars_equivalent, 2),
        'co2_factor_used': co2_factor
    }

def calculate_lifetime_carbon_savings(annual_energy_kwh, system_lifetime_years=25):
    """
    Calculate lifetime carbon savings for a solar system
    
    Args:
        annual_energy_kwh: Annual energy generation in kWh
        system_lifetime_years: Expected lifetime of solar system (default 25 years)
    
    Returns:
        dict with lifetime carbon savings metrics
    """
    lifetime_energy = annual_energy_kwh * system_lifetime_years
    savings = calculate_carbon_savings(lifetime_energy)
    
    savings['lifetime_energy_kwh'] = lifetime_energy
    savings['system_lifetime_years'] = system_lifetime_years
    
    return savings

