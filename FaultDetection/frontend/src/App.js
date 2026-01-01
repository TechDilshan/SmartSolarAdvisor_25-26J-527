import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Battery, Home, Zap, Menu, Bell, Plus, User, LogIn, LogOut, Activity } from 'lucide-react';
import axios from "axios";

function App() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('User');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [solarData, setSolarData] = useState({
    acpower: null,
    yieldtoday: null,
    yieldtotal: null,
    consumeenergy: null
  });

  const fetchSolarData = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/solax/realtime');
      console.log('Solar API response:', response.data);

      if (response.data.success && response.data.result) {
        setSolarData(response.data.result);
      } else {
        console.error('Solar API logical error:', response.data);
      }
    } catch (err) {
      console.error('Solar API request failed:', err);
    }
  };


  useEffect(() => {
    const token = localStorage.getItem('token');
    const userEmail = localStorage.getItem('userEmail');

    if (token && userEmail) {
      setIsLoggedIn(true);
      setUsername(userEmail);
    }

    fetchSolarData(); // 🔥 fetch real solar data
  }, []);



  const handleLogin = () => navigate('/login');

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
  };


  const getStatusText = (status) => {
    const statusMap = {
      '102': 'Offline',
      '0': 'Standby',
      '1': 'Normal',
      '2': 'Fault'
    };
    return statusMap[status] || 'Unknown';
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white shadow-lg transition-all duration-300 flex flex-col`}>
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md">
              <Sun className="w-6 h-6 text-yellow-300" />
            </div>
            {sidebarOpen && (
              <div className="flex flex-col">
                <span className="text-xl font-bold text-slate-800">SMART SOLAR ADVISO<span className="text-blue-600">R</span></span>
                <span className="text-xs text-slate-500">Power Management</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6">
          <a href="#" className="flex items-center gap-4 px-6 py-3 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-r-4 border-blue-600 font-medium transition-all hover:bg-blue-100">
            <Activity className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Overview</span>}
          </a>
          <a href="#" className="flex items-center gap-4 px-6 py-3 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all">
            <Sun className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Plant</span>}
          </a>
          <a href="#" className="flex items-center gap-4 px-6 py-3 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all">
            <Zap className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Devices</span>}
          </a>
          <a href="#" className="flex items-center gap-4 px-6 py-3 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all">
            <Battery className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Live Data</span>}
          </a>
        </nav>

        {/* Sidebar Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t border-slate-200">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white text-sm">
              <div className="font-semibold mb-1">Need Help?</div>
              <div className="text-xs text-blue-100">Contact our support team</div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="px-6 py-4 flex items-center justify-between">
            {/* Left Section */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-800"
              >
                <Menu className="w-6 h-6" />
              </button>
              {/* <div>
                <h1 className="text-2xl font-bold text-slate-800">Hayleys - K A S Kusuma...</h1>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-slate-500">Offline</span>
                </div>
              </div> */}
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {isLoggedIn && (
                <>
                  <button className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    <Bell className="w-5 h-5 text-slate-600" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                  </button>
                  <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-2 shadow-md">
                    <Plus className="w-4 h-4" />
                    <span className="font-medium">Add Device</span>
                  </button>
                  {/* <div className="flex items-center gap-3 px-4 py-2 bg-slate-100 rounded-lg">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{username}</span>
                    <button
                      onClick={handleLogout}
                      className="ml-2 p-1 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div> */}
                </>
              )}

              {isLoggedIn ? (
                <div className="flex items-center gap-3 px-4 py-2 bg-slate-100 rounded-lg">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{username}</span>
                  <button
                    onClick={handleLogout}
                    className="ml-2 p-1 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2 shadow-md font-medium"
                >
                  <LogIn className="w-5 h-5" />
                  <span>Login</span>
                </button>
              )}


            </div>
          </div>
        </header>

        {/* Weather Info Card */}
        <div className="bg-white rounded-2xl shadow-md p-5 border border-slate-200 w-[85%] mx-auto">

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold text-slate-800">24.0°C</div>
                <div className="text-slate-400 text-2xl">-</div>
                <div className="text-3xl font-bold text-slate-800">30.0°C</div>
              </div>
              <div className="h-12 w-px bg-slate-200"></div>
              <div className="text-sm text-slate-600 bg-slate-50 px-4 py-2 rounded-lg">
                <div className="font-medium">Tue | 2025/12/30</div>
                <div className="text-xs text-slate-500 mt-1">☀️ 06:22  🌙 18:05</div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors">
                <div className="text-4xl mb-1">☁️</div>
                <div className="text-xs font-medium text-slate-600">12/31</div>
              </div>
              <div className="text-center bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors">
                <div className="text-4xl mb-1">☀️</div>
                <div className="text-xs font-medium text-slate-600">01/01</div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

              {/* Left Panel - PV Power Meter */}
              <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-200">
                <div className="flex flex-col items-center">
                  {/* Circular Power Meter */}
                  <div className="relative w-56 h-56 mb-6">
                    <svg className="transform -rotate-90 w-56 h-56">
                      <circle
                        cx="112"
                        cy="112"
                        r="90"
                        className="stroke-slate-200"
                        strokeWidth="16"
                        fill="none"
                      />
                      <circle
                        cx="112"
                        cy="112"
                        r="90"
                        className="stroke-blue-500"
                        strokeWidth="16"
                        fill="none"
                        strokeDasharray={`${solarData.acpower != null
                          ? (solarData.acpower / 1000) * 565
                          : 0
                          } 565`}

                        strokeLinecap="round"
                        style={{
                          filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))',
                          transition: 'stroke-dasharray 0.5s ease'
                        }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-5xl font-bold text-slate-800">{solarData.acpower != null ? (solarData.acpower / 1000).toFixed(2) : "--"}
                      </div>
                      <div className="text-slate-500 text-lg font-medium mt-1">kW</div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-lg font-semibold text-slate-700">PV Power</div>
                    <div className="text-sm text-slate-500 mt-1 bg-slate-100 px-3 py-1 rounded-full inline-block">
                      PV Capacity: 6.00 kWp
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-200">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                    <div className="text-xs font-medium text-blue-600 mb-1">Daily Yield</div>
                    <div className="text-2xl font-bold text-slate-800">{solarData.yieldtoday != null ? solarData.yieldtoday.toFixed(2) : "--"}
                    </div>
                    <div className="text-xs text-slate-600 font-medium">kWh</div>
                    <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-blue-200">
                      Total: {solarData.yieldtotal != null ? solarData.yieldtotal.toFixed(2) : "--"}

                      kWh
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4">
                    <div className="text-xs font-medium text-slate-600 mb-1">Daily Consumption</div>
                    <div className="text-2xl font-bold text-slate-800">{solarData.consumeenergy != null ? solarData.consumeenergy.toFixed(2) : "--"}
                    </div>
                    <div className="text-xs text-slate-600 font-medium">kWh</div>
                    <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200">
                      Total: {solarData.consumeenergy != null
                        ? solarData.consumeenergy.toFixed(2)
                        : "--"} kWh
                    </div>

                  </div>
                </div>

                {/* Additional Stats */}
                <div className="mt-4 space-y-3">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1">Daily Self-Use Rate</div>
                    <div className="flex items-baseline gap-2">
                      <div className="text-xl font-bold text-slate-800">0.00</div>
                      <div className="text-sm text-slate-600">%</div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1">Imported Energy Today</div>
                    <div className="flex items-baseline gap-2">
                      <div className="text-xl font-bold text-slate-800">0.00</div>
                      <div className="text-sm text-slate-600">kWh</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center Panel - Energy Flow Visualization */}
              <div className="bg-gradient-to-br from-blue-50 via-white to-slate-50 rounded-2xl shadow-md p-6 border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-800">Energy Flow</h2>
                  <div className="px-3 py-1 bg-white rounded-full shadow-sm border border-slate-200 text-xs text-slate-600">
                    No Meter
                  </div>
                </div>

                <div className="relative h-96">
                  {/* Solar Panels - Top */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 via-orange-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
                      <Sun className="w-10 h-10 text-white" />
                    </div>
                    <div className="mt-3 bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-200">
                      <div className="text-sm font-bold text-slate-800">
                        {solarData.acpower != null
                          ? (solarData.acpower / 1000).toFixed(2)
                          : "--"} kW
                      </div>

                      <div className="text-xs text-slate-500">Solar</div>
                    </div>
                  </div>

                  {/* Inverter - Center */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-xl border-4 border-white">
                      <Zap className="w-12 h-12 text-white" />
                    </div>
                    <div className="mt-3 bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-200">
                      <div className="text-sm font-bold text-slate-800">--</div>
                      <div className="text-xs text-slate-500">Inverter</div>
                    </div>
                  </div>

                  {/* Battery - Right */}
                  <div className="absolute top-1/2 right-4 transform -translate-y-1/2 text-center">
                    <div className="w-16 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
                      <Battery className="w-8 h-8 text-white" />
                    </div>
                    <div className="mt-2 text-xs text-slate-600 font-medium">Battery</div>
                  </div>

                  {/* Home - Bottom Left */}
                  <div className="absolute bottom-8 left-1/4 transform -translate-x-1/2 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
                      <Home className="w-10 h-10 text-white" />
                    </div>
                    <div className="mt-3 bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-200">
                      <div className="text-sm font-bold text-slate-800">-- W</div>
                      <div className="text-xs text-slate-500">Home</div>
                    </div>
                  </div>

                  {/* Grid - Bottom Right */}
                  <div className="absolute bottom-8 right-1/4 transform translate-x-1/2 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
                      <Zap className="w-10 h-10 text-white" />
                    </div>
                    <div className="mt-3 bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-200">
                      <div className="text-sm font-bold text-slate-800">-- W</div>
                      <div className="text-xs text-slate-500">Grid</div>
                    </div>
                  </div>

                  {/* Animated Connecting Lines */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <defs>
                      <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.8" />
                      </linearGradient>
                    </defs>
                    <line x1="50%" y1="22%" x2="50%" y2="43%" stroke="url(#lineGradient)" strokeWidth="3" strokeDasharray="5,5">
                      <animate attributeName="stroke-dashoffset" from="10" to="0" dur="1s" repeatCount="indefinite" />
                    </line>
                    <line x1="50%" y1="57%" x2="28%" y2="72%" stroke="url(#lineGradient)" strokeWidth="3" strokeDasharray="5,5">
                      <animate attributeName="stroke-dashoffset" from="10" to="0" dur="1s" repeatCount="indefinite" />
                    </line>
                    <line x1="50%" y1="57%" x2="72%" y2="72%" stroke="url(#lineGradient)" strokeWidth="3" strokeDasharray="5,5">
                      <animate attributeName="stroke-dashoffset" from="10" to="0" dur="1s" repeatCount="indefinite" />
                    </line>
                    <line x1="58%" y1="50%" x2="78%" y2="50%" stroke="url(#lineGradient)" strokeWidth="3" strokeDasharray="5,5">
                      <animate attributeName="stroke-dashoffset" from="10" to="0" dur="1s" repeatCount="indefinite" />
                    </line>
                  </svg>
                </div>
              </div>

              {/* Right Panel - Device Information */}
              <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-200">
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
                  Device Information
                </h2>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  <div className="bg-slate-50 rounded-lg p-3 hover:bg-slate-100 transition-colors">
                    <div className="text-xs font-medium text-slate-500 mb-1">Inverter SN</div>
                    <div className="text-sm font-semibold text-slate-800">{solarData.inverterSN}</div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 hover:bg-slate-100 transition-colors">
                    <div className="text-xs font-medium text-slate-500 mb-1">Wi-Fi Module SN</div>
                    <div className="text-sm font-semibold text-slate-800">{solarData.sn}</div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3">
                    <div className="text-xs font-medium text-blue-600 mb-1">AC Output Power</div>
                    <div className="text-lg font-bold text-slate-800">{solarData.acpower ?? "--"} W
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 hover:bg-slate-100 transition-colors">
                    <div className="text-xs font-medium text-slate-500 mb-1">Inverter Type</div>
                    <div className="text-sm font-semibold text-slate-800">Type {solarData.inverterType}</div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 hover:bg-slate-100 transition-colors">
                    <div className="text-xs font-medium text-slate-500 mb-1">Inverter Status</div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${solarData.inverterStatus === '102' ? 'bg-slate-400' : 'bg-green-500'} shadow-lg`}></div>
                      <div className="text-sm font-semibold text-slate-800">{getStatusText(solarData.inverterStatus)}</div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 hover:bg-slate-100 transition-colors">
                    <div className="text-xs font-medium text-slate-500 mb-1">Upload Time</div>
                    <div className="text-sm font-semibold text-slate-800">{solarData.uploadTime}</div>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-3">
                    <div className="text-xs font-medium text-green-600 mb-1">Battery Power</div>
                    <div className="text-lg font-bold text-slate-800">{solarData.batPower || '--'} W</div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs font-medium text-slate-500 mb-3">PV Input Power</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg p-2.5 border border-blue-300">
                        <div className="text-xs text-blue-700 font-medium">PV1</div>
                        <div className="text-base font-bold text-slate-800 mt-1">{solarData.powerdc1} W</div>
                      </div>
                      <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg p-2.5 border border-blue-300">
                        <div className="text-xs text-blue-700 font-medium">PV2</div>
                        <div className="text-base font-bold text-slate-800 mt-1">{solarData.powerdc2} W</div>
                      </div>
                      <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg p-2.5 border border-slate-300">
                        <div className="text-xs text-slate-600 font-medium">PV3</div>
                        <div className="text-base font-bold text-slate-800 mt-1">{solarData.powerdc3 || '--'} W</div>
                      </div>
                      <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg p-2.5 border border-slate-300">
                        <div className="text-xs text-slate-600 font-medium">PV4</div>
                        <div className="text-base font-bold text-slate-800 mt-1">{solarData.powerdc4 || '--'} W</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-3">
                    <div className="text-xs font-medium text-green-600 mb-1">Battery SOC</div>
                    <div className="flex items-baseline gap-2">
                      <div className="text-lg font-bold text-slate-800">{solarData.soc || '--'}</div>
                      <div className="text-sm text-slate-600">%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}

export default App;