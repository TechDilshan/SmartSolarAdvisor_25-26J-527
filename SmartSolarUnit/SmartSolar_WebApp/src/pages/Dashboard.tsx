import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { LiveCounter } from "@/components/dashboard/LiveCounter";
import { SensorChart } from "@/components/charts/SensorChart";
import { useSolarSites, useSensorData, usePredictionData } from "@/hooks/useBackendAPI";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sun,
  Zap,
  CheckCircle2,
  TrendingUp,
  Thermometer,
  Droplets,
  Wind,
} from "lucide-react";

const Dashboard: React.FC = () => {
  const { isAdmin } = useAuth();
  const { sites, loading: sitesLoading } = useSolarSites();
  
  // Get first running site for demo data
  const runningSite = sites.find((s) => s.status === "running");
  const { data: sensorData } = useSensorData(runningSite?.device_id || null);
  const { dailyTotal, monthlyTotal } = usePredictionData(
    runningSite?.customer_name || null,
    runningSite?.id || null
  );

  const runningSystems = sites.filter((s) => s.status === "running").length;
  const completedSystems = sites.filter((s) => s.status === "completed").length;

  // Prepare chart data
  const irradianceData = sensorData.slice(-20).map((d) => ({
    time: new Date(d.timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    lux: d.bh1750?.lux_avg || 0,
  }));

  const temperatureData = sensorData.slice(-20).map((d) => ({
    time: new Date(d.timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    temp: d.dht_avg?.temp_c || 0,
    humidity: d.dht_avg?.["hum_%"] || 0,
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isAdmin ? "Dashboard Overview" : "My Solar Dashboard"}
          </h1>
          <p className="text-muted-foreground">
            {isAdmin 
              ? "Real-time monitoring of all solar energy systems"
              : "Real-time monitoring of your solar energy systems"}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {isAdmin ? (
            <>
          <StatsCard
            title="Total Sites"
            value={sitesLoading ? "-" : sites.length}
            subtitle="Registered solar installations"
            icon={Sun}
            variant="accent"
          />
          <StatsCard
            title="Running Systems"
            value={sitesLoading ? "-" : runningSystems}
            subtitle="Currently active"
            icon={Zap}
            variant="success"
          />
          <StatsCard
            title="Completed Systems"
            value={sitesLoading ? "-" : completedSystems}
            subtitle="Installation complete"
            icon={CheckCircle2}
          />
          <StatsCard
            title="Today's Prediction"
            value={`${dailyTotal.toFixed(4)} kWh`}
            subtitle="Total energy forecast"
            icon={TrendingUp}
            variant="accent"
          />
            </>
          ) : (
            <>
              <StatsCard
                title="My Sites"
                value={sitesLoading ? "-" : sites.length}
                subtitle="Your solar installations"
                icon={Sun}
                variant="accent"
              />
              <StatsCard
                title="Active Systems"
                value={sitesLoading ? "-" : runningSystems}
                subtitle="Currently generating"
                icon={Zap}
                variant="success"
              />
              <StatsCard
                title="Today's Energy"
                value={`${dailyTotal.toFixed(4)} kWh`}
                subtitle="Predicted generation"
                icon={TrendingUp}
                variant="accent"
              />
              <StatsCard
                title="Monthly Energy"
                value={`${monthlyTotal.toFixed(4)} kWh`}
                subtitle="This month's forecast"
                icon={CheckCircle2}
              />
            </>
          )}
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SensorChart
            data={irradianceData}
            dataKeys={[
              { key: "lux", color: "hsl(var(--chart-irradiance))", label: "Irradiance" },
            ]}
            title="Solar Irradiance"
            unit=" lux"
          />
          <SensorChart
            data={temperatureData}
            dataKeys={[
              { key: "temp", color: "hsl(var(--chart-temperature))", label: "Temperature" },
              { key: "humidity", color: "hsl(var(--chart-humidity))", label: "Humidity" },
            ]}
            title="Temperature & Humidity"
            unit=""
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {sensorData.length > 0 && (
            <>
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Sun className="w-4 h-4" />
                  <span className="text-xs">Current Irradiance</span>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {sensorData[sensorData.length - 1]?.bh1750?.lux_avg?.toFixed(1) || 0} lux
                </p>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Thermometer className="w-4 h-4" />
                  <span className="text-xs">Temperature</span>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {sensorData[sensorData.length - 1]?.dht_avg?.temp_c?.toFixed(1) || 0}°C
                </p>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Droplets className="w-4 h-4" />
                  <span className="text-xs">Humidity</span>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {sensorData[sensorData.length - 1]?.dht_avg?.["hum_%"]?.toFixed(1) || 0}%
                </p>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Wind className="w-4 h-4" />
                  <span className="text-xs">Dust Level</span>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {sensorData[sensorData.length - 1]?.dust?.mg_m3?.toFixed(2) || 0} mg/m³
                </p>
              </div>
            </>
          )}
          {sensorData.length === 0 && (
            <div className="col-span-4 p-8 rounded-lg bg-card border border-border text-center">
              <Sun className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No sensor data available. Connect your ESP32 device to start receiving data.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
