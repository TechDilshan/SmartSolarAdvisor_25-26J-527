import { useState } from "react";
import { LocationInput } from "@/components/LocationInput";
import { NearestDataCards } from "@/components/NearestDataCards";
import { MonthlyCharts } from "@/components/MonthlyCharts";
import { DailyCharts } from "@/components/DailyCharts";
import { RealtimeWeather } from "@/components/RealtimeWeather";
import { FinancialCalculator } from "@/components/FinancialCalculator";
import { fetchNearestLocation, fetchAggregateData, fetchRealtimeWeather } from "@/services/api";
import type { SolarRecord, AggregateResponse, WeatherResponse } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Zap, Sun } from "lucide-react";

const BASE_SYSTEM_KW = 5;

const CustomerDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [nearestRecord, setNearestRecord] = useState<SolarRecord | null>(null);
  const [monthlyData, setMonthlyData] = useState<AggregateResponse | null>(null);
  const [dailyData, setDailyData] = useState<AggregateResponse | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherResponse | null>(null);
  const [totalEnergy, setTotalEnergy] = useState<number | null>(null);
  const [systemKw, setSystemKw] = useState(BASE_SYSTEM_KW);
  const { toast } = useToast();

  const scaleFactor = systemKw / BASE_SYSTEM_KW;

  const handleSearch = async (lat: number, lng: number, kw: number) => {
    setLoading(true);
    setNearestRecord(null);
    setMonthlyData(null);
    setDailyData(null);
    setWeatherData(null);
    setTotalEnergy(null);
    setSystemKw(kw);

    try {
      const [records, monthly, daily, weather] = await Promise.all([
        fetchNearestLocation(lat, lng),
        fetchAggregateData(lat, lng, "monthly"),
        fetchAggregateData(lat, lng, "daily"),
        fetchRealtimeWeather(lat, lng),
      ]);

      setNearestRecord(records?.[0] || null);
      setMonthlyData(monthly);
      setDailyData(daily);
      setWeatherData(weather);

      const factor = kw / BASE_SYSTEM_KW;
      if (daily) {
        const total = Object.values(daily).reduce((s, v) => s + v.total_predicted_kwh_per5min, 0);
        setTotalEnergy(+(total * factor).toFixed(2));
      }

      if (!records?.length) toast({ title: "No Data", description: "No records found for this location." });
    } catch (e: any) {
      toast({ title: "API Error", description: e?.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <LocationInput onSearch={handleSearch} loading={loading} />

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-solar-gold" />
        </div>
      )}

      {/* Real-Time Weather */}
      {!loading && weatherData && <RealtimeWeather data={weatherData} />}

      {/* Total Energy Focus Box */}
      {!loading && totalEnergy !== null && (
        <div className="card-solar gradient-gold text-center py-8">
          <Zap className="h-10 w-10 mx-auto mb-2 text-primary" />
          <p className="text-sm font-medium text-primary/70 uppercase tracking-wide">Total Predicted Energy</p>
          <p className="text-5xl font-extrabold text-primary tracking-tight mt-1">{totalEnergy}</p>
          <p className="text-lg font-semibold text-primary/80 mt-1">kWh</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <Sun className="h-4 w-4 text-primary/60" />
            <p className="text-sm text-primary/60">
              Based on <span className="font-bold">{systemKw} kW</span> system
              {systemKw !== BASE_SYSTEM_KW && (
                <span className="ml-1">(scaled ×{scaleFactor.toFixed(1)} from {BASE_SYSTEM_KW} kW base)</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Financial Calculator */}
      {!loading && totalEnergy !== null && (
        <FinancialCalculator totalEnergyKwh={totalEnergy} systemKw={systemKw} />
      )}

      {!loading && nearestRecord && <NearestDataCards record={nearestRecord} />}
      {!loading && dailyData && <DailyCharts data={dailyData} scaleFactor={scaleFactor} systemKw={systemKw} />}
      {!loading && monthlyData && <MonthlyCharts data={monthlyData} scaleFactor={scaleFactor} systemKw={systemKw} />}

      {!loading && !nearestRecord && !monthlyData && !dailyData && (
        <div className="card-solar text-center py-16">
          <div className="gradient-gold rounded-2xl p-4 inline-block mb-4">
            <svg className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Ready to Analyze</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Click on the map or enter coordinates to analyze solar energy potential.
          </p>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
