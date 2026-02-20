import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sun, Battery, Zap, Menu, Bell, Plus, User, LogOut, Activity, History, TrendingUp } from 'lucide-react';
import Logo from '../images/Logo.png';

function Layout({ children, isLoggedIn, username, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Determine active tab based on current route
  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/') return 'overview';
    if (path === '/plant') return 'plant';
    if (path === '/add-device') return 'devices';
    if (path === '/live-data') return 'live';
    if (path === '/daily-history') return 'history';
    if (path === '/forecast') return 'forecast';
    return 'overview';
  };

  const activeTab = getActiveTab();

  const getLinkClasses = (tabName) => {
    const baseClasses = "flex items-center gap-4 px-6 py-3 font-medium transition-all";
    const activeClasses = "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-r-4 border-blue-600";
    const inactiveClasses = "text-slate-600 hover:bg-slate-50 hover:text-blue-600 border-r-0";
    return activeTab === tabName ? `${baseClasses} ${activeClasses}` : `${baseClasses} ${inactiveClasses}`;
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white shadow-lg transition-all duration-300 flex flex-col`}>
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <img src={Logo} alt="Smart Solar Advisor Logo" className="w-12 h-12 object-contain" />
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
          <Link
            to="/"
            className={getLinkClasses("overview")}
          >
            <Activity className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Overview</span>}
          </Link>

          <Link
            to="/plant"
            className={getLinkClasses("plant")}
          >
            <Sun className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Plant</span>}
          </Link>

          <Link
            to="/add-device"
            className={getLinkClasses("devices")}
          >
            <Activity className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Devices</span>}
          </Link>

          <Link
            to="/live-data"
            className={getLinkClasses("live")}
          >
            <Battery className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Live Data</span>}
          </Link>

          <Link
            to="/daily-history"
            className={getLinkClasses("history")}
          >
            <History className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Daily History</span>}
          </Link>

          <Link
            to="/forecast"
            className={getLinkClasses("forecast")}
          >
            <TrendingUp className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Forecast</span>}
          </Link>
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
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {isLoggedIn && (
                <>
                  <button className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    <Bell className="w-5 h-5 text-slate-600" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                  </button>
                  <button
                    onClick={() => navigate("/add-device")}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Device
                  </button>
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
                  onClick={() => navigate('/login')}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2 shadow-md font-medium"
                >
                  <span>Login</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;
