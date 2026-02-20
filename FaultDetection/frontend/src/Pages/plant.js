import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Battery, Home, Zap, Activity, TrendingUp, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import Layout from '../components/Layout';

function Plant() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('User');
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalDevices: 0,
    totalProduction: 0,
    totalYield: 0,
    activeDevices: 0,
    faultDevices: 0
  });

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
    if (devices.length > 0) {
      calculateSummary();
    }
  }, [devices]);

  const fetchDevices = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/devices', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success && response.data.devices) {
        setDevices(response.data.devices);
      }
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      let totalProduction = 0;
      let totalYield = 0;
      let activeDevices = 0;
      let faultDevices = 0;

      for (const device of devices) {
        if (device.latestData) {
          totalProduction += device.latestData.acpower || 0;
          totalYield += device.latestData.yieldtoday || 0;
        }
        if (device.status === 'active') activeDevices++;

        // Check fault status
        try {
          const faultResponse = await axios.get(
            `http://localhost:5001/api/faults/status/${device._id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (faultResponse.data.hasHistory && faultResponse.data.latestFault.faultDetected) {
            faultDevices++;
          }
        } catch (error) {
          // Ignore errors for fault check
        }
      }

      setSummary({
        totalDevices: devices.length,
        totalProduction,
        totalYield,
        activeDevices,
        faultDevices
      });
    } catch (error) {
      console.error('Failed to calculate summary:', error);
    }
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
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Sun className="w-6 h-6 text-yellow-500" />
            Plant Overview
          </h1>
          <p className="text-slate-600 mt-1">Complete solar plant monitoring and management</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 opacity-80" />
            </div>
            <div className="text-3xl font-bold">{summary.totalDevices}</div>
            <div className="text-sm opacity-90">Total Devices</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-8 h-8 opacity-80" />
            </div>
            <div className="text-3xl font-bold">{(summary.totalProduction / 1000).toFixed(2)}</div>
            <div className="text-sm opacity-90">Total Power (kW)</div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-md p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Sun className="w-8 h-8 opacity-80" />
            </div>
            <div className="text-3xl font-bold">{summary.totalYield.toFixed(2)}</div>
            <div className="text-sm opacity-90">Daily Yield (kWh)</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-md p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Battery className="w-8 h-8 opacity-80" />
            </div>
            <div className="text-3xl font-bold">{summary.activeDevices}</div>
            <div className="text-sm opacity-90">Active Devices</div>
          </div>

          <div className={`rounded-xl shadow-md p-6 text-white ${
            summary.faultDevices > 0 
              ? 'bg-gradient-to-br from-red-500 to-red-600' 
              : 'bg-gradient-to-br from-green-500 to-green-600'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 opacity-80" />
            </div>
            <div className="text-3xl font-bold">{summary.faultDevices}</div>
            <div className="text-sm opacity-90">Faulty Devices</div>
          </div>
        </div>

        {/* Devices List */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">All Devices</h2>
          {devices.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600 mb-4">No devices found</p>
              <button
                onClick={() => navigate('/add-device')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Device
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {devices.map(device => (
                <DeviceCard key={device._id} device={device} />
              ))}
            </div>
          )}
        </div>
        </div>
        </div>
        </div>
    </Layout>
  );
}

function DeviceCard({ device }) {
  const [faultStatus, setFaultStatus] = useState(null);

  useEffect(() => {
    const fetchFaultStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `http://localhost:5001/api/faults/status/${device._id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.hasHistory) {
          setFaultStatus(response.data.latestFault);
        }
      } catch (error) {
        // Ignore errors
      }
    };
    fetchFaultStatus();
  }, [device._id]);

  return (
    <div className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-slate-800">{device.deviceName}</h3>
          <p className="text-xs text-slate-500">{device.wifiSN}</p>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-semibold ${
          device.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {device.status}
        </span>
      </div>

      {device.latestData && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">AC Power</span>
            <span className="font-semibold">{(device.latestData.acpower || 0) / 1000} kW</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Daily Yield</span>
            <span className="font-semibold">{device.latestData.yieldtoday || 0} kWh</span>
          </div>
          {faultStatus && (
            <div className={`mt-2 p-2 rounded text-xs ${
              faultStatus.faultDetected 
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {faultStatus.faultDetected ? (
                <div className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Fault: {faultStatus.faultType.replace('_', ' ')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>Normal</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Plant;
