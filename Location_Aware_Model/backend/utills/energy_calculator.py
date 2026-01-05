import calendar

def compute_shading(rh):
    """
    Compute shading factor based on relative humidity.
    shading = 1 - (rh - 60) / 200
    Result is clamped between 0.75 and 1.0.
    """
    shading = 1 - (rh - 60) / 200
    return max(0.75, min(1.0, shading))


def calculate_monthly_energy_physics(input_data):
    """
    Calculate monthly solar energy (kWh)  -> Estimated monthly energy in kWh
        energy = ALLSKY_SFC_SW_DWN * days_in_month * installed_capacity_kw *
                 panel_efficiency * (1 - system_loss) * shading_factor
    """
    # Extract input values with defaults and validation
    solar_irradiance = input_data.get('allsky_sfc_sw_dwn') or input_data.get('ALLSKY_SFC_SW_DWN', 5.0)
    if solar_irradiance is None or not isinstance(solar_irradiance, (int, float)) or solar_irradiance <= 0:
        solar_irradiance = 5.0  # Default for Sri Lanka
    
    rh = input_data.get('rh2m') or input_data.get('RH2M', 75.0)
    if rh is None or not isinstance(rh, (int, float)):
        rh = 75.0
    
    installed_capacity_kw = input_data.get('installed_capacity_kw', 5.0)
    if installed_capacity_kw is None or not isinstance(installed_capacity_kw, (int, float)) or installed_capacity_kw <= 0:
        installed_capacity_kw = 5.0
    
    panel_efficiency = input_data.get('panel_efficiency', 0.18)
    if panel_efficiency is None or not isinstance(panel_efficiency, (int, float)) or panel_efficiency <= 0:
        panel_efficiency = 0.18
    # Clamp efficiency to reasonable range
    panel_efficiency = max(0.15, min(0.25, panel_efficiency))
    
    system_loss = input_data.get('system_loss', 0.14)
    if system_loss is None or not isinstance(system_loss, (int, float)):
        system_loss = 0.14
    # Clamp system loss to reasonable range
    system_loss = max(0.0, min(0.5, system_loss))

    # Compute shading factor if not provided
    shading_factor = input_data.get('shading_factor')
    if shading_factor is None or not isinstance(shading_factor, (int, float)):
        shading_factor = compute_shading(rh)
    # Clamp shading factor to valid range
    shading_factor = max(0.0, min(1.0, shading_factor))

    # Determine days in month with validation
    year = input_data.get('year', 2024)
    month = input_data.get('month', 1)
    try:
        year = int(year) if year else 2024
        month = int(month) if month else 1
        # Validate month range
        month = max(1, min(12, month))
        # Validate year range (reasonable solar system lifetime)
        year = max(2000, min(2100, year))
        days_in_month = calendar.monthrange(year, month)[1]
    except (ValueError, TypeError, calendar.IllegalMonthError):
        # Fallback to current month
        from datetime import datetime
        now = datetime.now()
        days_in_month = calendar.monthrange(now.year, now.month)[1]

    # Monthly energy calculation with validation
    try:
        monthly_energy = (
            float(solar_irradiance) *
            days_in_month *
            float(installed_capacity_kw) *
            float(panel_efficiency) *
            (1 - float(system_loss)) *
            float(shading_factor)
        )
        # Ensure non-negative result
        monthly_energy = max(0.0, monthly_energy)
    except (ValueError, TypeError) as e:
        # Return a safe default if calculation fails
        monthly_energy = 100.0  # Reasonable default monthly energy

    return round(monthly_energy, 2)
