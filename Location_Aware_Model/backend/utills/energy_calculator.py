import calendar

def compute_shading(rh):
    """
    Compute shading factor based on relative humidity
    Formula: shading = 1 - (rh - 60) / 200
    Clamped between 0.75 and 1.0
    """
    shading = 1 - (rh - 60) / 200
    return max(0.75, min(1.0, shading))

def calculate_monthly_energy_physics(input_data):
    """
    Calculate monthly energy using physics-based formula:
    energy = ALLSKY_SFC_SW_DWN * days_in_month * installed_capacity_kw * 
             panel_efficiency * (1 - system_loss) * shading_factor
    
    Where shading_factor is computed from relative humidity using compute_shading()
    
    Args:
        input_data: dict with keys:
            - year, month
            - allsky_sfc_sw_dwn (or ALLSKY_SFC_SW_DWN)
            - rh2m (or RH2M) - relative humidity
            - installed_capacity_kw
            - panel_efficiency
            - system_loss
            - shading_factor (optional, will be computed from rh if not provided)
    
    Returns:
        float: Monthly energy in kWh
    """
    # Get solar irradiance (handle both case variations)
    solar_irradiance = input_data.get('allsky_sfc_sw_dwn') or input_data.get('ALLSKY_SFC_SW_DWN', 5.0)
    
    # Get relative humidity (handle both case variations)
    rh = input_data.get('rh2m') or input_data.get('RH2M', 75.0)
    
    # Get system parameters
    installed_capacity_kw = input_data.get('installed_capacity_kw', 5.0)
    panel_efficiency = input_data.get('panel_efficiency', 0.18)
    system_loss = input_data.get('system_loss', 0.14)
    
    # Get or compute shading factor
    shading_factor = input_data.get('shading_factor')
    if shading_factor is None:
        shading_factor = compute_shading(rh)
    
    # Get year and month for days calculation
    year = input_data.get('year', 2024)
    month = input_data.get('month', 1)
    
    # Calculate days in month
    days_in_month = calendar.monthrange(int(year), int(month))[1]
    
    # Calculate monthly energy using the formula
    monthly_energy = (
        solar_irradiance *
        days_in_month *
        installed_capacity_kw *
        panel_efficiency *
        (1 - system_loss) *
        shading_factor
    )
    
    return max(0, monthly_energy)

