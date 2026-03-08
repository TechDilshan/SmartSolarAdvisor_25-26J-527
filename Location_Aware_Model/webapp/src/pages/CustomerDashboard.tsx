import { useRef, useState } from "react";
import { LocationInput } from "@/components/LocationInput";
import { NearestDataCards } from "@/components/NearestDataCards";
import { MonthlyCharts } from "@/components/MonthlyCharts";
import { DailyCharts } from "@/components/DailyCharts";
import { RealtimeWeather } from "@/components/RealtimeWeather";
import { FinancialCalculator } from "@/components/FinancialCalculator";
import { fetchNearestLocation, fetchAggregateData, fetchRealtimeWeather } from "@/services/api";
import type { SolarRecord, AggregateResponse, WeatherResponse } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Zap, Sun, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportElementToPdf } from "@/utils/exportPdf";

const BASE_SYSTEM_KW = 5;

const CustomerDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [nearestRecord, setNearestRecord] = useState<SolarRecord | null>(null);
  const [monthlyData, setMonthlyData] = useState<AggregateResponse | null>(null);
  const [dailyData, setDailyData] = useState<AggregateResponse | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherResponse | null>(null);
  const [totalEnergy, setTotalEnergy] = useState<number | null>(null);
  const [systemKw, setSystemKw] = useState(BASE_SYSTEM_KW);
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement | null>(null);

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

  const handleDownloadReport = async () => {
    if (!reportRef.current) return;
    setExportingPdf(true);
    try {
      const locationPart = nearestRecord
        ? `${nearestRecord.latitude.toFixed(4)}_${nearestRecord.longitude.toFixed(4)}`
        : "location";
      await exportElementToPdf(reportRef.current, {
        filename: `Feasibility_Report_${locationPart}_${systemKw}kW.pdf`,
        marginMm: 15,
      });
    } catch (e: any) {
      toast({
        title: "PDF Export Failed",
        description: e?.message || "Could not generate the report.",
        variant: "destructive",
      });
    } finally {
      setExportingPdf(false);
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

      {/* Report Export Action */}
      {!loading && totalEnergy !== null && (
        <div className="flex justify-end">
          <Button onClick={handleDownloadReport} disabled={exportingPdf}>
            {exportingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download Feasibility Report (PDF)
          </Button>
        </div>
      )}

      {/* Normal on-screen dashboard content */}
      {!loading && weatherData && <RealtimeWeather data={weatherData} />}

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

      {!loading && totalEnergy !== null && (
        <FinancialCalculator totalEnergyKwh={totalEnergy} systemKw={systemKw} />
      )}

      {!loading && nearestRecord && <NearestDataCards record={nearestRecord} />}
      {!loading && dailyData && <DailyCharts data={dailyData} scaleFactor={scaleFactor} systemKw={systemKw} />}
      {!loading && monthlyData && <MonthlyCharts data={monthlyData} scaleFactor={scaleFactor} systemKw={systemKw} />}

      {/* Hidden, PDF-friendly report (no map tiles; avoids CORS/canvas issues). Padding aligns with PDF margins (15mm). */}
      <div
        ref={reportRef}
        className="fixed left-[-10000px] top-0 space-y-6 bg-white text-black box-border"
        style={{ width: "210mm", minHeight: "297mm", padding: "15mm" }}
        aria-hidden="true"
      >
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Solar Feasibility Report</h2>
          <p className="text-sm text-neutral-600">
            Generated: {new Date().toLocaleString()}
          </p>
        </div>

        {nearestRecord && (
          <div className="rounded-xl border border-neutral-200 p-4">
            <h3 className="text-lg font-semibold mb-2">Selected Location (Nearest Site)</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="font-medium">Latitude:</span> {nearestRecord.latitude.toFixed(6)}</div>
              <div><span className="font-medium">Longitude:</span> {nearestRecord.longitude.toFixed(6)}</div>
              <div><span className="font-medium">Date:</span> {nearestRecord.date}</div>
              <div><span className="font-medium">Time:</span> {nearestRecord.time}</div>
              <div><span className="font-medium">Panel Area:</span> {nearestRecord.panel_area_m2} m²</div>
              <div><span className="font-medium">System Size:</span> {systemKw} kW</div>
            </div>
          </div>
        )}

        {totalEnergy !== null && (
          <div className="rounded-xl border border-neutral-200 p-4">
            <h3 className="text-lg font-semibold mb-2">Energy Summary</h3>
            <div className="text-3xl font-extrabold">{totalEnergy} kWh</div>
            <div className="text-sm text-neutral-600">
              Scaled from {BASE_SYSTEM_KW} kW baseline (×{scaleFactor.toFixed(2)})
            </div>
          </div>
        )}

        {weatherData && (
          <div className="rounded-xl border border-neutral-200 p-4">
            <h3 className="text-lg font-semibold mb-2">Current Weather Snapshot</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="font-medium">Time:</span> {weatherData.current.time}</div>
              <div><span className="font-medium">Temp:</span> {weatherData.current.temperature_2m}{weatherData.current_units.temperature_2m}</div>
              <div><span className="font-medium">Humidity:</span> {weatherData.current.relative_humidity_2m}{weatherData.current_units.relative_humidity_2m}</div>
              <div><span className="font-medium">Wind:</span> {weatherData.current.wind_speed_10m}{weatherData.current_units.wind_speed_10m}</div>
            </div>
          </div>
        )}

        {nearestRecord && (
          <div className="rounded-xl border border-neutral-200 p-4">
            <h3 className="text-lg font-semibold mb-2">Nearest Record KPIs</h3>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg border border-neutral-200 p-3"><div className="text-neutral-600">Temperature</div><div className="font-bold">{nearestRecord.temperature} °C</div></div>
              <div className="rounded-lg border border-neutral-200 p-3"><div className="text-neutral-600">Humidity</div><div className="font-bold">{nearestRecord.humidity} %</div></div>
              <div className="rounded-lg border border-neutral-200 p-3"><div className="text-neutral-600">Irradiance</div><div className="font-bold">{nearestRecord.irradiance} W/m²</div></div>
              <div className="rounded-lg border border-neutral-200 p-3"><div className="text-neutral-600">Dust</div><div className="font-bold">{nearestRecord.dust_level}</div></div>
              <div className="rounded-lg border border-neutral-200 p-3"><div className="text-neutral-600">Rainfall</div><div className="font-bold">{nearestRecord.rainfall} mm</div></div>
              <div className="rounded-lg border border-neutral-200 p-3"><div className="text-neutral-600">Energy</div><div className="font-bold">{nearestRecord.predicted_kwh_per5min} kWh/5min</div></div>
            </div>
          </div>
        )}

        {totalEnergy !== null && (
          <div className="rounded-xl border border-neutral-200 p-4">
            <h3 className="text-lg font-semibold mb-3">Financial Summary (Inputs required)</h3>
            <p className="text-sm text-neutral-600">
              Use the ROI calculator on the dashboard and enter buy rate + system cost. (Those inputs are not embedded into the PDF yet.)
            </p>
          </div>
        )}

        {dailyData && <DailyCharts data={dailyData} scaleFactor={scaleFactor} systemKw={systemKw} />}
        {monthlyData && <MonthlyCharts data={monthlyData} scaleFactor={scaleFactor} systemKw={systemKw} />}
      </div>

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
