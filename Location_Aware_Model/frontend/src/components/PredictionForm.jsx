import React, { useState, useEffect, useRef } from 'react';
import { predictionsAPI, weatherAPI } from '../services/api';
import LocationMap from './LocationMap';
import '../styles/PredictionForm.css';

function PredictionForm({ onPredictionComplete }) {
  const [formData, setFormData] = useState({
    latitude: 6.9271,  
    longitude: 79.8612,
    allsky_sfc_sw_dwn: 5.5,
    rh2m: 75.0,
    t2m: 27.5, 
    ws2m: 3.5,
    tilt_deg: 8.0, 
    azimuth_deg: 180.0, 
    installed_capacity_kw: 5.0,
    panel_efficiency: 0.21, 
    system_loss: 0.12,  
    shading_factor: 0.96,  
    electricity_rate: 35.0, 
    system_cost_per_kw: 220000  
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [predictionType, setPredictionType] = useState('monthly');
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const hasMounted = useRef(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: parseFloat(value) || value
    });
  };

  const fetchWeatherData = async (lat, lon) => {
    if (lat === null || lat === undefined || lon === null || lon === undefined) return;
    if (isNaN(lat) || isNaN(lon)) return;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return;
    
    setLoadingWeather(true);
    try {
      const response = await weatherAPI.getWeatherData(lat, lon);
      const weather = response.data;
      
      // Update form with weather data
      setFormData(prev => ({
        ...prev,
        allsky_sfc_sw_dwn: weather.solar_irradiance || prev.allsky_sfc_sw_dwn,
        rh2m: weather.humidity || prev.rh2m,
        t2m: weather.temperature || prev.t2m,
        ws2m: weather.wind_speed || prev.ws2m
      }));
      
      setWeatherData(weather);
    } catch (err) {
      console.error('Failed to fetch weather data:', err);
    } finally {
      setLoadingWeather(false);
    }
  };

  const handleLocationChange = (lat, lon) => {
    if (isNaN(lat) || isNaN(lon)) {
      console.error('Invalid coordinates: NaN values', lat, lon);
      return;
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      console.error('Invalid coordinates: out of range', lat, lon);
      return;
    }
    
    const roundedLat = Math.round(lat * 10000) / 10000;
    const roundedLon = Math.round(lon * 10000) / 10000;
    
    setFormData(prev => ({
      ...prev,
      latitude: roundedLat,
      longitude: roundedLon
    }));
    
    fetchWeatherData(roundedLat, roundedLon);
  };

  useEffect(() => {
    // Auto-calculate optimal tilt and azimuth based on latitude
    if (formData.latitude) {
      // For Sri Lanka (5-10°N), optimal tilt is close to latitude
      const optimalTilt = Math.min(Math.max(Math.abs(formData.latitude), 5), 15);
      const optimalAzimuth = 180; // Always south-facing in Northern hemisphere
      
      // Only update if still at default values
      setFormData(prev => ({
        ...prev,
        tilt_deg: prev.tilt_deg === 8.0 ? optimalTilt : prev.tilt_deg,
        azimuth_deg: prev.azimuth_deg === 180.0 ? optimalAzimuth : prev.azimuth_deg
      }));
    }
  }, [formData.latitude]);

  useEffect(() => {
    if (!hasMounted.current && formData.latitude && formData.longitude) {
      hasMounted.current = true;
      fetchWeatherData(formData.latitude, formData.longitude);
    }
  }, [formData.latitude, formData.longitude]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let response;
      if (predictionType === 'annual') {
        response = await predictionsAPI.predictAnnual(formData);
      } else {
        response = await predictionsAPI.predict(formData);
      }
      onPredictionComplete(response.data, predictionType);
    } catch (err) {
      setError(err.response?.data?.error || 'Prediction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Preset locations for Sri Lanka
  const sriLankaPresets = [
    { name: 'Colombo', lat: 6.9271, lon: 79.8612 },
    { name: 'Kandy', lat: 7.2906, lon: 80.6337 },
    { name: 'Galle', lat: 6.0535, lon: 80.2210 },
    { name: 'Jaffna', lat: 9.6615, lon: 80.0255 },
    { name: 'Trincomalee', lat: 8.5874, lon: 81.2152 }
  ];

  return (
    <div className="prediction-form-container">
      <h2>🔮 Solar Energy Prediction - Sri Lanka</h2>
      
      <div className="prediction-type-selector">
        <button
          className={predictionType === 'monthly' ? 'active' : ''}
          onClick={() => setPredictionType('monthly')}
        >
          Monthly Prediction
        </button>
        <button
          className={predictionType === 'annual' ? 'active' : ''}
          onClick={() => setPredictionType('annual')}
        >
          Annual Prediction
        </button>
      </div>

      <form onSubmit={handleSubmit} className="prediction-form">
        {error && <div className="error-message">{error}</div>}

        <div className="form-section">
          <div className="section-header">
            <h3> Location Details</h3>
            <button
              type="button"
              className="toggle-map-btn"
              onClick={() => setShowMap(!showMap)}
            >
              {showMap ? ' Hide Map' : ' Show Map'}
            </button>
          </div>

          {/* Quick location presets */}
          <div className="location-presets">
            <label style={{fontSize: '0.9em', color: '#666'}}>Quick Select:</label>
            <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px'}}>
              {sriLankaPresets.map(preset => (
                <button
                  key={preset.name}
                  type="button"
                  className="preset-btn"
                  onClick={() => handleLocationChange(preset.lat, preset.lon)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.85em',
                    background: '#f0f0f0',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
          
          {showMap && (
            <div className="map-section">
              <LocationMap
                latitude={formData.latitude}
                longitude={formData.longitude}
                onLocationChange={handleLocationChange}
                height="350px"
              />
            </div>
          )}
          
          <div className="form-grid" style={{marginTop: '16px'}}>
            <div className="form-group">
              <label>Latitude</label>
              <input
                type="number"
                value={formData.latitude?.toFixed(4) || ''}
                readOnly
                style={{background: '#f5f5f5'}}
              />
            </div>
            <div className="form-group">
              <label>Longitude</label>
              <input
                type="number"
                value={formData.longitude?.toFixed(4) || ''}
                readOnly
                style={{background: '#f5f5f5'}}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-header">
            <h3> Climate Data</h3>
            {loadingWeather && <span className="loading-badge">Loading weather...</span>}
            {weatherData && (
              <button
                type="button"
                className="refresh-weather-btn"
                onClick={() => fetchWeatherData(formData.latitude, formData.longitude)}
                title="Refresh weather data"
              >
                 Refresh
              </button>
            )}
          </div>
          {weatherData && (
            <div className="weather-info">
              <div className="weather-info-header">
                <span> {weatherData.location || `Lat: ${formData.latitude?.toFixed(4)}, Lon: ${formData.longitude?.toFixed(4)}`}</span>
                {weatherData.source && (
                  <span className="weather-source">
                    {weatherData.source === 'OpenWeatherMap' ? 'Live Data' : 'Estimated'}
                  </span>
                )}
              </div>
              <div className="weather-metrics">
                <span> {weatherData.temperature?.toFixed(1)}°C</span>
                <span> {weatherData.humidity?.toFixed(1)}%</span>
                <span> {weatherData.solar_irradiance?.toFixed(2)} kWh/m²/day</span>
                <span> {weatherData.wind_speed?.toFixed(1)} m/s</span>
              </div>
            </div>
          )}
          <div className="form-grid">
            <div className="form-group">
              <label>Solar Irradiance (kWh/m²/day)</label>
              <input
                type="number"
                name="allsky_sfc_sw_dwn"
                value={formData.allsky_sfc_sw_dwn}
                onChange={handleChange}
                step="0.1"
                required
              />
              <small style={{color: '#666', fontSize: '0.85em'}}>Sri Lanka: 4.5-6.5 kWh/m²/day</small>
            </div>
            <div className="form-group">
              <label>Relative Humidity (%)</label>
              <input
                type="number"
                name="rh2m"
                value={formData.rh2m}
                onChange={handleChange}
                step="0.1"
                required
              />
            </div>
            <div className="form-group">
              <label>Temperature (°C)</label>
              <input
                type="number"
                name="t2m"
                value={formData.t2m}
                onChange={handleChange}
                step="0.1"
                required
              />
              <small style={{color: '#666', fontSize: '0.85em'}}>Sri Lanka: 26-30°C average</small>
            </div>
            <div className="form-group">
              <label>Wind Speed (m/s)</label>
              <input
                type="number"
                name="ws2m"
                value={formData.ws2m}
                onChange={handleChange}
                step="0.1"
                required
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>System Configuration</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Tilt Angle (degrees)</label>
              <input
                type="number"
                name="tilt_deg"
                value={formData.tilt_deg}
                onChange={handleChange}
                step="0.1"
                min="0"
                max="90"
                required
              />
              <small style={{color: '#666', fontSize: '0.85em'}}>Optimal for SL: 5-15° (≈latitude)</small>
            </div>
            <div className="form-group">
              <label>Azimuth Angle (degrees)</label>
              <input
                type="number"
                name="azimuth_deg"
                value={formData.azimuth_deg}
                onChange={handleChange}
                step="0.1"
                min="0"
                max="360"
                required
              />
              <small style={{color: '#666', fontSize: '0.85em'}}>180° = South (optimal for SL)</small>
            </div>
            <div className="form-group">
              <label>Installed Capacity (kW)</label>
              <input
                type="number"
                name="installed_capacity_kw"
                value={formData.installed_capacity_kw}
                onChange={handleChange}
                step="0.1"
                min="0.1"
                required
              />
            </div>
            <div className="form-group">
              <label>Panel Efficiency (0-1)</label>
              <input
                type="number"
                name="panel_efficiency"
                value={formData.panel_efficiency}
                onChange={handleChange}
                step="0.01"
                min="0.15"
                max="0.25"
                required
              />
              <small style={{color: '#666', fontSize: '0.85em'}}>Modern: 0.20-0.22 (20-22%)</small>
            </div>
            <div className="form-group">
              <label>System Loss (0-1)</label>
              <input
                type="number"
                name="system_loss"
                value={formData.system_loss}
                onChange={handleChange}
                step="0.01"
                min="0"
                max="0.5"
                required
              />
              <small style={{color: '#666', fontSize: '0.85em'}}>Typical: 0.10-0.15 (10-15%)</small>
            </div>
            <div className="form-group">
              <label>Shading Factor (0-1)</label>
              <input
                type="number"
                name="shading_factor"
                value={formData.shading_factor}
                onChange={handleChange}
                step="0.01"
                min="0"
                max="1"
                required
              />
              <small style={{color: '#666', fontSize: '0.85em'}}>Clear: 0.95-1.0, Partial: 0.80-0.90</small>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3> Financial Parameters</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Electricity Rate (LKR/kWh)</label>
              <input
                type="number"
                name="electricity_rate"
                value={formData.electricity_rate}
                onChange={handleChange}
                step="1"
                min="0"
                placeholder="35.0"
              />
              <small style={{color: '#666', fontSize: '0.85em'}}>2025: Residential 30-40, Commercial 45-55, Industrial 28-35</small>
            </div>
            <div className="form-group">
              <label>System Cost per kW (LKR)</label>
              <input
                type="number"
                name="system_cost_per_kw"
                value={formData.system_cost_per_kw}
                onChange={handleChange}
                step="1000"
                min="0"
                placeholder="220000"
              />
            
            </div>
          </div>
        </div>

        <button type="submit" className="predict-button" disabled={loading}>
          {loading ? ' Predicting...' : ' Generate Prediction'}
        </button>
      </form>
    </div>
  );
}

export default PredictionForm;