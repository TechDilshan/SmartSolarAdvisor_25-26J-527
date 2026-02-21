import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Calendar, Activity, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import Layout from '../components/Layout';

function Forecast() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('User');
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [forecasts, setForecasts] = useState([]);
  const [hoursAhead, setHoursAhead] = useState(24);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userEmail = localStorage.getItem('userEmail');
    if (!token) {
      navigate('/login');
      return;
    }
    setIsLoggedIn(true);
    setUsername(userEmail || 'User');
    fetchDevices();
  }, [navigate]);

  useEffect(() => {
    if (selectedDevice) {
      fetchForecast();
    }
  }, [selectedDevice, hoursAhead]);

  const fetchDevices = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/devices?refresh=true', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success && response.data.devices) {
        setDevices(response.data.devices);
        if (response.data.devices.length > 0 && !selectedDevice) {
          setSelectedDevice(response.data.devices[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    }
  };

  const fetchForecast = async () => {
    if (!selectedDevice) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5001/api/faults/forecast/${selectedDevice._id}?hoursAhead=${hoursAhead}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setForecasts(response.data.forecasts || []);
      }
    } catch (error) {
      console.error('Failed to fetch forecast:', error);
      setForecasts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getMaxProduction = () => {
    if (forecasts.length === 0) return 0;
    return Math.max(...forecasts.map(f => f.predictedProduction));
  };

  const getAverageProduction = () => {
    if (forecasts.length === 0) return 0;
    const sum = forecasts.reduce((acc, f) => acc + f.predictedProduction, 0);
    return sum / forecasts.length;
  };

  const maxProduction = getMaxProduction();
  const avgProduction = getAverageProduction();

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  return (
    <Layout isLoggedIn={isLoggedIn} username={username} onLogout={handleLogout}>
      <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="p-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Production Forecast
          </h1>
          <p className="text-slate-600 mt-1">Predict future solar production and potential faults</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Device</label>
              <select
                value={selectedDevice?._id || ''}
                onChange={(e) => {
                  const device = devices.find(d => d._id === e.target.value);
                  setSelectedDevice(device);
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {devices.map(device => (
                  <option key={device._id} value={device._id}>
                    {device.deviceName} ({device.wifiSN})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Forecast Period</label>
              <select
                value={hoursAhead}
                onChange={(e) => setHoursAhead(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={6}>6 Hours</option>
                <option value={12}>12 Hours</option>
                <option value={24}>24 Hours</option>
                <option value={48}>48 Hours</option>
                <option value={72}>72 Hours</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        {forecasts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="text-sm text-slate-600 mb-1">Max Production</div>
              <div className="text-3xl font-bold text-blue-600">{(maxProduction / 1000).toFixed(2)} kW</div>
              <div className="text-xs text-slate-500 mt-1">Peak forecast</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="text-sm text-slate-600 mb-1">Average Production</div>
              <div className="text-3xl font-bold text-green-600">{(avgProduction / 1000).toFixed(2)} kW</div>
              <div className="text-xs text-slate-500 mt-1">Over forecast period</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="text-sm text-slate-600 mb-1">Total Forecast</div>
              <div className="text-3xl font-bold text-purple-600">{forecasts.length}</div>
              <div className="text-xs text-slate-500 mt-1">Data points</div>
            </div>
          </div>
        )}

        {/* Forecast Chart */}
        {!selectedDevice ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-slate-600">Please select a device to view forecast</p>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-slate-600">Generating forecast...</p>
          </div>
        ) : forecasts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-slate-600">No forecast data available</p>
          </div>
        ) : (
          <>
            {/* Chart Visualization */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Production Forecast Chart</h2>
              <div className="h-64 flex items-end justify-between gap-1">
                {forecasts.map((forecast, index) => {
                  const height = maxProduction > 0 ? (forecast.predictedProduction / maxProduction) * 100 : 0;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all hover:from-blue-600 hover:to-blue-500"
                        style={{ height: `${height}%`, minHeight: '4px' }}
                        title={`${formatTime(forecast.timestamp)}: ${(forecast.predictedProduction / 1000).toFixed(2)} kW`}
                      />
                      {index % Math.ceil(forecasts.length / 8) === 0 && (
                        <div className="text-xs text-slate-500 mt-1 transform -rotate-45 origin-left whitespace-nowrap">
                          {new Date(forecast.timestamp).getHours()}:00
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Forecast Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Predicted Production</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Temperature</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Radiation</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sunshine</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {forecasts.map((forecast, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {formatTime(forecast.timestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-semibold text-slate-900">
                              {(forecast.predictedProduction / 1000).toFixed(2)} kW
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {forecast.weather.AirTemperature}°C
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {forecast.weather.Radiation} W/m²
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {forecast.weather.Sunshine}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
      </div>
      </div>
    </Layout>
  );
}

export default Forecast;
