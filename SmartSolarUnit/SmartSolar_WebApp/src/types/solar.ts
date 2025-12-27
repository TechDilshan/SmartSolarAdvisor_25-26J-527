// Solar Site Types
export interface SolarSite {
  id: string;
  site_name: string;
  customer_name: string;
  device_id: string;
  system_kw: number;
  panel_type: string;
  panel_count: number;
  inverter_type: string;
  inverter_capacity_kw: number;
  status: "running" | "completed" | "maintenance";
  created_at: string;
}

// Sensor Data Types
export interface SensorData {
  timestamp: string;
  device_id: string;
  bh1750: {
    lux1: number;
    lux2: number;
    lux_avg: number;
  };
  dht1: {
    "hum_%": number;
    temp_c: number;
  };
  dht2: {
    "hum_%": number;
    temp_c: number;
  };
  dht_avg: {
    temp_c: number;
    "hum_%": number;
  };
  dust: {
    mg_m3: number;
    raw: number;
    voltage: number;
  };
  rain: {
    pct1: number;
    pct2: number;
    raw1: number;
    raw2: number;
  };
  rssi: number;
}

// Prediction Data Types
export interface PredictionData {
  timestamp?: string;
  device_id: string;
  features_used: {
    dust_level: number;
    humidity: number;
    irradiance: number;
    rainfall: number;
    temperature: number;
  };
  interval: string;
  panel_area_m2: number;
  predicted_kwh_5min: number;
  unit: string;
}

// Dashboard Stats
export interface DashboardStats {
  totalSites: number;
  runningSystems: number;
  completedSystems: number;
  todayPredictedKwh: number;
  monthlyPredictedKwh: number;
}

// Chart Data Point
export interface ChartDataPoint {
  time: string;
  value: number;
  label?: string;
}

// User Types
export interface AdminUser {
  id: string;
  email: string;
  role: "admin" | "site_owner";
  name?: string;
}
