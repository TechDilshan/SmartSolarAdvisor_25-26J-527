import React from "react";
import { Link } from "react-router-dom";
import {
  Sun,
  Battery,
  Home,
  Zap,
  Activity
} from "lucide-react";

function SideBar({ sidebarOpen }) {
  return (
    <aside
      className={`${
        sidebarOpen ? "w-64" : "w-20"
      } bg-white shadow-lg transition-all duration-300 flex flex-col`}
    >
      {/* Logo */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md">
            <Sun className="w-6 h-6 text-yellow-300" />
          </div>
          {sidebarOpen && (
            <div className="flex flex-col">
              <span className="text-xl font-bold text-slate-800">
                SMART SOLAR ADVISO<span className="text-blue-600">R</span>
              </span>
              <span className="text-xs text-slate-500">
                Power Management
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6">
        <Link
          to="/"
          className="flex items-center gap-4 px-6 py-3 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-r-4 border-blue-600 font-medium transition-all hover:bg-blue-100"
        >
          <Activity className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span>Overview</span>}
        </Link>

        <a
          href="#"
          className="flex items-center gap-4 px-6 py-3 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all"
        >
          <Sun className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span>Plant</span>}
        </a>

        <Link
          to="/add-device"
          className="flex items-center gap-4 px-6 py-3 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all"
        >
          <Zap className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span>Devices</span>}
        </Link>

        <a
          href="#"
          className="flex items-center gap-4 px-6 py-3 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all"
        >
          <Battery className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span>Live Data</span>}
        </a>
      </nav>

      {/* Help box */}
      {sidebarOpen && (
        <div className="p-4 border-t border-slate-200">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white text-sm">
            <div className="font-semibold mb-1">Need Help?</div>
            <div className="text-xs text-blue-100">
              Contact our support team
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

export default SideBar;
