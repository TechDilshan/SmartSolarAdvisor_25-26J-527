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
    # Extract input values with defaults
    solar_irradiance = input_data.get('allsky_sfc_sw_dwn') or input_data.get('ALLSKY_SFC_SW_DWN', 5.0)
    rh = input_data.get('rh2m') or input_data.get('RH2M', 75.0)
    installed_capacity_kw = input_data.get('installed_capacity_kw', 5.0)
    panel_efficiency = input_data.get('panel_efficiency', 0.18)
    system_loss = input_data.get('system_loss', 0.14)

    # Compute shading factor if not provided
    shading_factor = input_data.get('shading_factor', compute_shading(rh))

    # Determine days in month
    year = input_data.get('year', 2024)
    month = input_data.get('month', 1)
    days_in_month = calendar.monthrange(int(year), int(month))[1]

    # monthly energy calculation
    monthly_energy = (
        solar_irradiance *
        days_in_month *
        installed_capacity_kw *
        panel_efficiency *
        (1 - system_loss) *
        shading_factor
    )

    return max(0, monthly_energy)
