import { useState, useEffect } from "react";
import { ref, onValue, off, query, orderByKey, limitToLast } from "firebase/database";
import { database, isFirebaseConfigured } from "@/lib/firebase";
import { SensorData, PredictionData, SolarSite } from "@/types/solar";

// Hook for real-time sensor data
export const useSensorData = (deviceId: string | null) => {
  const [data, setData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deviceId || !isFirebaseConfigured || !database) {
      setLoading(false);
      return;
    }

    const sensorRef = query(
      ref(database, `devices/${deviceId}`),
      orderByKey(),
      limitToLast(50)
    );

    const unsubscribe = onValue(
      sensorRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const rawData = snapshot.val();
          const formattedData: SensorData[] = Object.entries(rawData).map(
            ([timestamp, values]: [string, any]) => ({
              timestamp,
              ...values,
            })
          );
          setData(formattedData.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          ));
        } else {
          setData([]);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => off(sensorRef);
  }, [deviceId]);

  return { data, loading, error };
};

// Hook for real-time prediction data
export const usePredictionData = (customerName: string | null, siteId: string | null) => {
  const [data, setData] = useState<PredictionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [monthlyTotal, setMonthlyTotal] = useState(0);

  useEffect(() => {
    if (!customerName || !siteId || !isFirebaseConfigured || !database) {
      setLoading(false);
      return;
    }

    const predictionRef = query(
      ref(database, `predicted_units/${customerName}/${siteId}`),
      orderByKey(),
      limitToLast(288) // Last 24 hours at 5-min intervals
    );

    const unsubscribe = onValue(
      predictionRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const rawData = snapshot.val();
          const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
          const currentMonth = today.substring(0, 6);

          let dayTotal = 0;
          let monthTotal = 0;

          const formattedData: PredictionData[] = Object.entries(rawData).map(
            ([timestamp, values]: [string, any]) => {
              const dateKey = timestamp.substring(0, 8);
              const monthKey = timestamp.substring(0, 6);

              if (dateKey === today) {
                dayTotal += values.predicted_kwh_5min || 0;
              }
              if (monthKey === currentMonth) {
                monthTotal += values.predicted_kwh_5min || 0;
              }

              return {
                timestamp,
                ...values,
              };
            }
          );

          setData(formattedData);
          setDailyTotal(dayTotal);
          setMonthlyTotal(monthTotal);
        } else {
          setData([]);
          setDailyTotal(0);
          setMonthlyTotal(0);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => off(predictionRef);
  }, [customerName, siteId]);

  return { data, dailyTotal, monthlyTotal, loading, error };
};

// Hook for all solar sites
export const useSolarSites = () => {
  const [sites, setSites] = useState<SolarSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !database) {
      setLoading(false);
      return;
    }

    const sitesRef = ref(database, "solar_sites");

    const unsubscribe = onValue(
      sitesRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const rawData = snapshot.val();
          const formattedSites: SolarSite[] = Object.entries(rawData).map(
            ([id, values]: [string, any]) => ({
              id,
              ...values,
            })
          );
          setSites(formattedSites);
        } else {
          setSites([]);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => off(sitesRef);
  }, []);

  return { sites, loading, error };
};

// Hook for single solar site
export const useSolarSite = (siteId: string | null) => {
  const [site, setSite] = useState<SolarSite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!siteId || !isFirebaseConfigured || !database) {
      setLoading(false);
      return;
    }

    const siteRef = ref(database, `solar_sites/${siteId}`);

    const unsubscribe = onValue(
      siteRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setSite({ id: siteId, ...snapshot.val() });
        } else {
          setSite(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => off(siteRef);
  }, [siteId]);

  return { site, loading, error };
};
