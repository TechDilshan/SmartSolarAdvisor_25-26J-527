import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, RefreshCw, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import axios from 'axios';
import Layout from '../components/Layout';

function LiveData() {   
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('User');
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [faultStatus, setFaultStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

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
    if (selectedDevice && autoRefresh) {
      fetchLiveData();
      const interval = setInterval(() => {
        fetchLiveData();
      }, 5 * 60 * 1000); // Every 5 minutes

      return () => clearInterval(interval);
    }
  }, [selectedDevice, autoRefresh]);

  const fetchDevices = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/devices', {
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
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveData = async () => {
    if (!selectedDevice) return;

    try {
      setIsRefreshing(true);
      const token = localStorage.getItem('token');

      // Fetch weather data
      const weatherResponse = await axios.get('http://localhost:5001/api/weather/realtime');
      
      // Fetch device data
      const deviceResponse = await axios.get(`http://localhost:5001/api/devices/${selectedDevice._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Detect fault
      const faultResponse = await axios.post(
        `http://localhost:5001/api/faults/detect/${selectedDevice._id}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setLiveData({
        weather: weatherResponse.data,
        device: deviceResponse.data.device,
        fault: faultResponse.data.faultDetection
      });

      setFaultStatus(faultResponse.data.faultDetection);
    } catch (error) {
      console.error('Failed to fetch live data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getFaultColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getFaultIcon = (faultDetected) => {
    return faultDetected ? (
      <AlertTriangle className="w-6 h-6 text-red-600" />
    ) : (
      <CheckCircle className="w-6 h-6 text-green-600" />
    );
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  if (loading) {
    return (
      <Layout isLoggedIn={isLoggedIn} username={username} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-slate-600">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout isLoggedIn={isLoggedIn} username={username} onLogout={handleLogout}>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="p-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Activity className="w-6 h-6 text-blue-600" />
                Live Data Monitoring
              </h1>
              <p className="text-slate-600 mt-1">Real-time solar system monitoring and fault detection</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-slate-600">Auto Refresh (5 min)</span>
              </label>
              <button
                onClick={fetchLiveData}
                disabled={isRefreshing || !selectedDevice}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Device Selector */}
        {devices.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-4 mb-6">
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
        )}

        {!selectedDevice ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-slate-600">No devices available. Please add a device first.</p>
            <button
              onClick={() => navigate('/add-device')}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Device
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Fault Status Card */}
            <div className="lg:col-span-3 bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                Fault Detection Status
              </h2>
              {faultStatus ? (
                <div className={`p-6 rounded-lg border-2 ${getFaultColor(faultStatus.faultSeverity)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      {getFaultIcon(faultStatus.faultDetected)}
                      <div>
                        <h3 className="text-lg font-bold">
                          {faultStatus.faultDetected ? 'Fault Detected' : 'System Normal'}
                        </h3>
                        <p className="text-sm mt-1">
                          {faultStatus.faultDetected
                            ? `Fault Type: ${faultStatus.faultType.replace('_', ' ').toUpperCase()}`
                            : 'No faults detected in the system'}
                        </p>
                        <p className="text-xs mt-2 opacity-75">
                          Severity: {faultStatus.faultSeverity.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {faultStatus.deviation > 0 ? '+' : ''}{faultStatus.deviation.toFixed(1)}%
                      </div>
                      <div className="text-xs opacity-75">Deviation</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  Click Refresh to check fault status
                </div>
              )}
            </div>

            {/* Weather Data */}
            {liveData?.weather && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Weather Conditions</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600">Temperature</span>
                    <span className="font-semibold">{liveData.weather.airTemperature}°C</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600">Humidity</span>
                    <span className="font-semibold">{liveData.weather.relativeAirHumidity}%</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600">Wind Speed</span>
                    <span className="font-semibold">{liveData.weather.windSpeed} m/s</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600">Sunshine</span>
                    <span className="font-semibold">{liveData.weather.sunshine}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600">Radiation</span>
                    <span className="font-semibold">{liveData.weather.radiation} W/m²</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-600">Air Pressure</span>
                    <span className="font-semibold">{liveData.weather.airPressure} hPa</span>
                  </div>
                </div>
              </div>
            )}

            {/* Production Comparison */}
            {faultStatus && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Production Analysis</h2>
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-600">Predicted Production</span>
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {faultStatus.predictedProduction.toFixed(2)} W
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-600">Actual Production</span>
                      <Activity className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {faultStatus.actualProduction.toFixed(2)} W
                    </div>
                  </div>
                  <div className={`rounded-lg p-4 ${
                    faultStatus.deviation < 0 ? 'bg-red-50' : 'bg-green-50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-600">Difference</span>
                      {faultStatus.deviation < 0 ? (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <div className={`text-2xl font-bold ${
                      faultStatus.deviation < 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {Math.abs(faultStatus.deviation).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Device Info */}
            {liveData?.device && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Device Information</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600">Device Name</span>
                    <span className="font-semibold">{liveData.device.deviceName}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600">WiFi SN</span>
                    <span className="font-semibold text-xs">{liveData.device.wifiSN}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600">Status</span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      liveData.device.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {liveData.device.status}
                    </span>
                  </div>
                  {liveData.device.latestData && (
                    <>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-600">AC Power</span>
                        <span className="font-semibold">{liveData.device.latestData.acpower || 0} W</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-600">Daily Yield</span>
                        <span className="font-semibold">{liveData.device.latestData.yieldtoday || 0} kWh</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-slate-600">Battery SOC</span>
                        <span className="font-semibold">{liveData.device.latestData.soc || 0}%</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
      </div>
    </Layout>
  );
}

export default LiveData;
