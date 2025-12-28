import { useState, useEffect, useRef } from 'react';
import { sitesAPI, sensorsAPI, predictionsAPI } from '../services/api';
import { SensorData, PredictionData, SolarSystem } from '../types';

// Hook for all solar sites with realtime polling
export const useSolarSites = (pollInterval: number = 5000) => {
  const [sites, setSites] = useState<SolarSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSites = async () => {
    try {
      const data = await sitesAPI.getAll();
      // Transform API response to match SolarSystem format
      const formattedSites: SolarSystem[] = data.map((site: any) => ({
        id: site.id || site._id,
        siteName: site.site_name || site.customer_name || 'Unknown Site',
        systemCapacity: site.system_capacity || site.capacity || 0,
        panelCount: site.panel_count || site.panels || 0,
        inverterCapacity: site.inverter_capacity || site.inverter || 0,
        status: site.status === 'running' ? 'running' : 'completed',
        lastUpdated: site.last_updated ? new Date(site.last_updated) : new Date(),
        deviceId: site.device_id,
        customerName: site.customer_name,
      }));
      setSites(formattedSites);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sites');
      console.error('Error fetching sites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();

    // Set up polling for realtime updates
    intervalRef.current = setInterval(fetchSites, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [pollInterval]);

  return { sites, loading, error, refetch: fetchSites };
};

// Hook for single solar site with realtime polling
export const useSolarSite = (siteId: string | null, pollInterval: number = 5000) => {
  const [site, setSite] = useState<SolarSystem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSite = async () => {
    if (!siteId) {
      setLoading(false);
      return;
    }

    try {
      const data = await sitesAPI.getById(siteId);
      const formattedSite: SolarSystem = {
        id: data.id || data._id,
        siteName: data.site_name || data.customer_name || 'Unknown Site',
        systemCapacity: data.system_capacity || data.capacity || 0,
        panelCount: data.panel_count || data.panels || 0,
        inverterCapacity: data.inverter_capacity || data.inverter || 0,
        status: data.status === 'running' ? 'running' : 'completed',
        lastUpdated: data.last_updated ? new Date(data.last_updated) : new Date(),
        deviceId: data.device_id,
        customerName: data.customer_name,
      };
      setSite(formattedSite);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch site');
      console.error('Error fetching site:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!siteId) {
      setSite(null);
      setLoading(false);
      return;
    }

    fetchSite();

    // Set up polling for realtime updates
    intervalRef.current = setInterval(fetchSite, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [siteId, pollInterval]);

  return { site, loading, error, refetch: fetchSite };
};

// Hook for real-time sensor data with polling
export const useSensorData = (deviceId: string | null, pollInterval: number = 5000) => {
  const [data, setData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSensorData = async () => {
    if (!deviceId) {
      setLoading(false);
      return;
    }

    try {
      const readings = await sensorsAPI.getRecent(deviceId, 50);
      // Transform API response to match SensorData format
      const formattedData: SensorData[] = readings.map((reading: any) => ({
        timestamp: new Date(reading.timestamp || reading.created_at),
        irradiance: reading.bh1750?.lux_avg || reading.irradiance || 0,
        temperature: reading.dht_avg?.temp_c || reading.temperature || 0,
        humidity: reading.dht_avg?.['hum_%'] || reading.humidity || 0,
        dustLevel: reading.dust_sensor?.dust_density || reading.dustLevel || 0,
        rainLevel: reading.rain_sensor?.rain_level || reading.rainLevel || 0,
      }));
      
      setData(formattedData.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sensor data');
      console.error('Error fetching sensor data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!deviceId) {
      setData([]);
      setLoading(false);
      return;
    }

    fetchSensorData();

    // Set up polling for realtime updates
    intervalRef.current = setInterval(fetchSensorData, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [deviceId, pollInterval]);

  return { data, loading, error, refetch: fetchSensorData };
};

// Hook for real-time prediction data with polling
export const usePredictionData = (
  customerName: string | null,
  siteId: string | null,
  pollInterval: number = 10000 // Poll predictions less frequently
) => {
  const [data, setData] = useState<PredictionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPredictionData = async () => {
    if (!customerName || !siteId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch summary which includes daily, monthly, and latest
      const summary = await predictionsAPI.getSummary(customerName, siteId);
      
      // Fetch recent predictions for chart data
      const allPredictions = await predictionsAPI.getAll(customerName, siteId);
      
      // Transform API response
      const formattedData: PredictionData[] = allPredictions
        .slice(-288) // Last 24 hours at 5-min intervals
        .map((pred: any) => ({
          timestamp: new Date(pred.timestamp || pred.created_at),
          predictedEnergy: pred.predicted_kwh_5min || pred.predictedEnergy || 0,
        }));

      setData(formattedData);
      setDailyTotal(summary.daily?.totalKwh || 0);
      setMonthlyTotal(summary.monthly?.totalKwh || 0);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch prediction data');
      console.error('Error fetching prediction data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!customerName || !siteId) {
      setData([]);
      setDailyTotal(0);
      setMonthlyTotal(0);
      setLoading(false);
      return;
    }

    fetchPredictionData();

    // Set up polling for realtime updates
    intervalRef.current = setInterval(fetchPredictionData, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [customerName, siteId, pollInterval]);

  return { data, dailyTotal, monthlyTotal, loading, error, refetch: fetchPredictionData };
};

// Hook for daily performance data
export const useDailyPerformance = (
  customerName: string | null,
  siteId: string | null,
  date: Date,
  pollInterval: number = 30000 // Poll every 30 seconds
) => {
  const [hourlyData, setHourlyData] = useState<Array<{ hour: number; energy: number }>>([]);
  const [totalEnergy, setTotalEnergy] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDailyData = async () => {
    if (!customerName || !siteId) {
      setLoading(false);
      return;
    }

    try {
      const dateStr = date.toISOString().split('T')[0];
      const startTime = `${dateStr}T00:00:00`;
      const endTime = `${dateStr}T23:59:59`;
      
      // Fetch predictions for the day
      const predictions = await predictionsAPI.getByRange(customerName, siteId, startTime, endTime);
      
      // Group by hour
      const hourlyMap: Record<number, number> = {};
      predictions.forEach((pred: any) => {
        const hour = new Date(pred.timestamp || pred.created_at).getHours();
        const energy = pred.predicted_kwh_5min || pred.predictedEnergy || 0;
        hourlyMap[hour] = (hourlyMap[hour] || 0) + energy;
      });

      const hourly = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        energy: hourlyMap[i] || 0,
      }));

      setHourlyData(hourly);
      setTotalEnergy(hourly.reduce((sum, h) => sum + h.energy, 0));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch daily data');
      console.error('Error fetching daily data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyData();
    intervalRef.current = setInterval(fetchDailyData, pollInterval);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [customerName, siteId, date.toISOString().split('T')[0], pollInterval]);

  return { hourlyData, totalEnergy, loading, error, refetch: fetchDailyData };
};

// Hook for monthly performance data
export const useMonthlyPerformance = (
  customerName: string | null,
  siteId: string | null,
  yearMonth: string,
  pollInterval: number = 60000 // Poll every minute
) => {
  const [dailyData, setDailyData] = useState<Array<{ date: number; energy: number }>>([]);
  const [totalEnergy, setTotalEnergy] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMonthlyData = async () => {
    if (!customerName || !siteId) {
      setLoading(false);
      return;
    }

    try {
      const [year, month] = yearMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      const startTime = startDate.toISOString().split('T')[0];
      const endTime = endDate.toISOString().split('T')[0];
      
      // Fetch predictions for the month
      const predictions = await predictionsAPI.getByRange(customerName, siteId, startTime, endTime);
      
      // Group by day
      const dailyMap: Record<number, number> = {};
      predictions.forEach((pred: any) => {
        const day = new Date(pred.timestamp || pred.created_at).getDate();
        const energy = pred.predicted_kwh_5min || pred.predictedEnergy || 0;
        dailyMap[day] = (dailyMap[day] || 0) + energy;
      });

      const daysInMonth = endDate.getDate();
      const daily = Array.from({ length: daysInMonth }, (_, i) => ({
        date: i + 1,
        energy: dailyMap[i + 1] || 0,
      }));

      setDailyData(daily);
      setTotalEnergy(daily.reduce((sum, d) => sum + d.energy, 0));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch monthly data');
      console.error('Error fetching monthly data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyData();
    intervalRef.current = setInterval(fetchMonthlyData, pollInterval);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [customerName, siteId, yearMonth, pollInterval]);

  return { dailyData, totalEnergy, loading, error, refetch: fetchMonthlyData };
};

