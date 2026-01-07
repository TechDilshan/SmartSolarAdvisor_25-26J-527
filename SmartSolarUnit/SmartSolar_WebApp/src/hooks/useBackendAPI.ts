import { useState, useEffect, useRef } from "react";
import { sitesAPI, sensorsAPI, predictionsAPI } from "@/lib/api";
import { SensorData, PredictionData, SolarSite } from "@/types/solar";

// Hook for all solar sites with realtime polling
export const useSolarSites = (pollInterval: number = 5000) => {
  const [sites, setSites] = useState<SolarSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSites = async () => {
    try {
      const data = await sitesAPI.getAll();
      setSites(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch sites");
      console.error("Error fetching sites:", err);
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

  return { sites, loading, error };
};

// Hook for single solar site with realtime polling
export const useSolarSite = (siteId: string | null, pollInterval: number = 5000) => {
  const [site, setSite] = useState<SolarSite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSite = async () => {
    if (!siteId) {
      setLoading(false);
      return;
    }

    try {
      const data = await sitesAPI.getById(siteId);
      setSite(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch site");
      console.error("Error fetching site:", err);
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

  return { site, loading, error };
};

// Hook for real-time sensor data with polling
export const useSensorData = (deviceId: string | null, pollInterval: number = 5000) => {
  const [data, setData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSensorData = async () => {
    if (!deviceId) {
      setLoading(false);
      return;
    }

    try {
      const readings = await sensorsAPI.getRecent(deviceId, 50);
      // Transform API response to match SensorData format
      const formattedData: SensorData[] = readings.map((reading: any) => ({
        timestamp: reading.timestamp,
        ...reading,
      }));
      
      setData(formattedData.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ));
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch sensor data");
      console.error("Error fetching sensor data:", err);
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

  return { data, loading, error };
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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
          timestamp: pred.timestamp,
          predicted_kwh_5min: pred.predicted_kwh_5min || 0,
          interval: pred.interval || "5min",
          unit: pred.unit || "kWh",
          device_id: pred.device_id || "",
          panel_area_m2: pred.panel_area_m2 || 0,
        }));

      setData(formattedData);
      setDailyTotal(summary.daily?.totalKwh || 0);
      setMonthlyTotal(summary.monthly?.totalKwh || 0);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch prediction data");
      console.error("Error fetching prediction data:", err);
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

  return { data, dailyTotal, monthlyTotal, loading, error };
};

