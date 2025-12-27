import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { format, parse } from "date-fns";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { LiveCounter } from "@/components/dashboard/LiveCounter";
import { SensorChart } from "@/components/charts/SensorChart";
import { EnergyBarChart } from "@/components/charts/EnergyBarChart";
import { DayDetailsModal } from "@/components/charts/DayDetailsModal";
import { useDailyPredictions } from "@/hooks/useDailyPredictions";
import {
  useSolarSite,
  useSensorData,
  usePredictionData,
} from "@/hooks/useBackendAPI";
import {
  ArrowLeft,
  Sun,
  Zap,
  Battery,
  Cpu,
  Calendar,
  Thermometer,
  Droplets,
  Wind,
  CloudRain,
  Signal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const SiteDetail: React.FC = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const { isAdmin } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { site, loading: siteLoading, error: siteError } = useSolarSite(siteId || null);
  const { data: sensorData, loading: sensorLoading } = useSensorData(
    site?.device_id || null
  );
  const { data: predictionData, dailyTotal, monthlyTotal } = usePredictionData(
    site?.customer_name || null,
    siteId || null
  );
  // Use site creation date as start date for the 30-day chart
  const startDate = site?.created_at || null;
  
  const { dailyData: monthlyDailyData, loading: dailyLoading } = useDailyPredictions(
    site?.customer_name || null,
    siteId || null,
    30,
    startDate
  );

  if (siteLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64 lg:col-span-2" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (siteError || !site) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <Sun className="w-16 h-16 text-destructive mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Site Not Found</h2>
          <p className="text-muted-foreground mb-4">{siteError || "The requested site does not exist."}</p>
          <Link to="/sites">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sites
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // Prepare chart data
  const irradianceChartData = sensorData.slice(-30).map((d) => ({
    time: new Date(d.timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    lux: d.bh1750?.lux_avg || 0,
  }));

  const tempHumidityChartData = sensorData.slice(-30).map((d) => ({
    time: new Date(d.timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    temp: d.dht_avg?.temp_c || 0,
    humidity: d.dht_avg?.["hum_%"] || 0,
  }));

  const dustRainChartData = sensorData.slice(-30).map((d) => ({
    time: new Date(d.timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    dust: d.dust?.mg_m3 || 0,
    rain: ((d.rain?.pct1 || 0) + (d.rain?.pct2 || 0)) / 2,
  }));

  const predictionChartData = predictionData.slice(-30).map((d) => ({
    time: d.timestamp?.substring(9, 15) || "",
    predicted: d.predicted_kwh_5min * 1000, // Convert to Wh for better visualization
  }));

  // Prepare 30 days of daily energy data
  const dailyEnergyData = monthlyDailyData.map((day) => {
    const date = parse(day.date, 'yyyyMMdd', new Date());
    const dayLabel = format(date, 'MMM dd');
    return {
      label: dayLabel,
      value: day.totalKwh,
      date: day.date, // Store date for modal
    };
  });

  const handleBarClick = (data: any) => {
    if (data.date) {
      setSelectedDate(data.date);
      setIsModalOpen(true);
    }
  };

  const latestSensor = sensorData[sensorData.length - 1];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <Link to="/sites">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{site.site_name}</h1>
              <span
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium",
                  site.status === "running"
                    ? "bg-success/10 text-success"
                    : site.status === "completed"
                    ? "bg-muted text-muted-foreground"
                    : "bg-warning/10 text-warning"
                )}
              >
                {site.status.charAt(0).toUpperCase() + site.status.slice(1)}
              </span>
            </div>
            <p className="text-muted-foreground">{site.customer_name}</p>
          </div>
          {site.status === "running" && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium">
              <span className="relative w-2 h-2 rounded-full bg-success status-pulse" />
              Live Data
            </div>
          )}
        </div>

        {/* System Details + Live Counters */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* System Info Card */}
          <div className="p-6 rounded-xl bg-card border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">System Details</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">System Size</p>
                  <p className="font-semibold text-foreground">{site.system_kw} kW</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Sun className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Panels</p>
                  <p className="font-semibold text-foreground">
                    {site.panel_count}x {site.panel_type}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Battery className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Inverter</p>
                  <p className="font-semibold text-foreground">
                    {site.inverter_type} ({site.inverter_capacity_kw} kW)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Device ID</p>
                  <p className="font-semibold text-foreground">{site.device_id}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-semibold text-foreground">{site.created_at}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Live Counters */}
          <LiveCounter
            value={dailyTotal}
            unit="kWh"
            label="Today's Predicted Energy"
          />
          <LiveCounter
            value={monthlyTotal}
            unit="kWh"
            label="Monthly Predicted Energy"
          />
        </div>

        {/* Current Sensor Readings */}
        {latestSensor && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="p-4 rounded-lg bg-card border border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Sun className="w-4 h-4" />
                <span className="text-xs">Irradiance</span>
              </div>
              <p className="text-xl font-bold text-foreground">
                {latestSensor.bh1750?.lux_avg?.toFixed(1) || 0} lux
              </p>
            </div>
            <div className="p-4 rounded-lg bg-card border border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Thermometer className="w-4 h-4" />
                <span className="text-xs">Temperature</span>
              </div>
              <p className="text-xl font-bold text-foreground">
                {latestSensor.dht_avg?.temp_c?.toFixed(1) || 0}°C
              </p>
            </div>
            <div className="p-4 rounded-lg bg-card border border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Droplets className="w-4 h-4" />
                <span className="text-xs">Humidity</span>
              </div>
              <p className="text-xl font-bold text-foreground">
                {latestSensor.dht_avg?.["hum_%"]?.toFixed(1) || 0}%
              </p>
            </div>
            <div className="p-4 rounded-lg bg-card border border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Wind className="w-4 h-4" />
                <span className="text-xs">Dust</span>
              </div>
              <p className="text-xl font-bold text-foreground">
                {latestSensor.dust?.mg_m3?.toFixed(3) || 0} mg/m³
              </p>
            </div>
            <div className="p-4 rounded-lg bg-card border border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CloudRain className="w-4 h-4" />
                <span className="text-xs">Rain</span>
              </div>
              <p className="text-xl font-bold text-foreground">
                {((latestSensor.rain?.pct1 || 0) + (latestSensor.rain?.pct2 || 0)) / 2}%
              </p>
            </div>
            <div className="p-4 rounded-lg bg-card border border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Signal className="w-4 h-4" />
                <span className="text-xs">Signal</span>
              </div>
              <p className="text-xl font-bold text-foreground">{latestSensor.rssi} dBm</p>
            </div>
          </div>
        )}

        {/* Sensor Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SensorChart
            data={irradianceChartData}
            dataKeys={[
              { key: "lux", color: "hsl(var(--chart-irradiance))", label: "Irradiance" },
            ]}
            title="Solar Irradiance"
            unit=" lux"
          />
          <SensorChart
            data={tempHumidityChartData}
            dataKeys={[
              { key: "temp", color: "hsl(var(--chart-temperature))", label: "Temperature (°C)" },
              { key: "humidity", color: "hsl(var(--chart-humidity))", label: "Humidity (%)" },
            ]}
            title="Temperature & Humidity"
            unit=""
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SensorChart
            data={dustRainChartData}
            dataKeys={[
              { key: "dust", color: "hsl(var(--muted-foreground))", label: "Dust (mg/m³)" },
              { key: "rain", color: "hsl(var(--chart-humidity))", label: "Rain (%)" },
            ]}
            title="Dust & Rain"
            unit=""
          />
          <SensorChart
            data={predictionChartData}
            dataKeys={[
              { key: "predicted", color: "hsl(var(--chart-prediction))", label: "Predicted (Wh)" },
            ]}
            title="5-Minute Energy Predictions"
            unit=" Wh"
          />
        </div>

        {/* Daily Energy Chart */}
        <EnergyBarChart
          data={dailyEnergyData}
          title="Daily Energy Generation (Last 30 Days)"
          subtitle="Click on any bar to view detailed 5-minute predictions for that day"
          onBarClick={handleBarClick}
        />
      </div>

      {/* Day Details Modal */}
      {selectedDate && site && (
        <DayDetailsModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          date={selectedDate}
          customerName={site.customer_name}
          siteId={site.id}
          dailyTotal={
            monthlyDailyData.find((d) => d.date === selectedDate)?.totalKwh || 0
          }
        />
      )}
    </DashboardLayout>
  );
};

export default SiteDetail;
