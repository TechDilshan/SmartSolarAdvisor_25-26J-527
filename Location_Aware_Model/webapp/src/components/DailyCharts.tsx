import { useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { KPICard } from "./KPICard";
import { Zap, Thermometer, Droplets, Sun, Wind, CloudRain } from "lucide-react";
import type { AggregateResponse } from "@/services/api";

interface DailyChartsProps {
  data: AggregateResponse;
  scaleFactor?: number;
  systemKw?: number;
}

export const DailyCharts = ({ data, scaleFactor = 1, systemKw = 5 }: DailyChartsProps) => {
  const chartData = useMemo(
    () =>
      Object.entries(data)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, v]) => ({
          name: key,
          energy: +(v.total_predicted_kwh_per5min * scaleFactor).toFixed(4),
          irradiance: +v.average_irradiance.toFixed(2),
          temp: +v.average_temperature.toFixed(2),
          humidity: +v.average_humidity.toFixed(2),
          dust: +v.average_dust_level.toFixed(4),
          rainfall: +v.average_rainfall.toFixed(2),
        })),
    [data, scaleFactor]
  );

  const stats = useMemo(() => {
    const totalEnergy = chartData.reduce((s, d) => s + d.energy, 0);
    const avgTemp = chartData.reduce((s, d) => s + d.temp, 0) / (chartData.length || 1);
    const avgHumidity = chartData.reduce((s, d) => s + d.humidity, 0) / (chartData.length || 1);
    const avgIrradiance = chartData.reduce((s, d) => s + d.irradiance, 0) / (chartData.length || 1);
    const avgDust = chartData.reduce((s, d) => s + d.dust, 0) / (chartData.length || 1);
    const avgRainfall = chartData.reduce((s, d) => s + d.rainfall, 0) / (chartData.length || 1);
    return { totalEnergy: +totalEnergy.toFixed(4), avgTemp: +avgTemp.toFixed(2), avgHumidity: +avgHumidity.toFixed(2), avgIrradiance: +avgIrradiance.toFixed(2), avgDust: +avgDust.toFixed(4), avgRainfall: +avgRainfall.toFixed(2) };
  }, [chartData]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-foreground">📈 Daily Analytics</h3>
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{systemKw} kW System</span>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title="Total Energy" value={stats.totalEnergy} unit="kWh" icon={Zap} color="green" />
        <KPICard title="Avg Temperature" value={stats.avgTemp} unit="°C" icon={Thermometer} color="gold" />
        <KPICard title="Avg Humidity" value={stats.avgHumidity} unit="%" icon={Droplets} color="sky" />
        <KPICard title="Avg Irradiance" value={stats.avgIrradiance} unit="W/m²" icon={Sun} color="gold" />
        <KPICard title="Avg Dust Level" value={stats.avgDust} icon={Wind} color="blue" />
        <KPICard title="Avg Rainfall" value={stats.avgRainfall} unit="mm" icon={CloudRain} color="sky" />
      </div>

      {/* Daily Energy Production - Bar */}
      <div className="card-solar">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Daily Energy Production — {systemKw} kW System (Bar Chart)</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={55} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="energy" fill="hsl(42 100% 50%)" radius={[4, 4, 0, 0]} name="Energy (kWh)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Temperature & Humidity - Scatter dots */}
      <div className="card-solar">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Temperature & Humidity (Daily Scatter)</h4>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
            <XAxis dataKey="name" name="Date" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={55} allowDuplicatedCategory={false} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Legend />
            <Scatter data={chartData.map(d => ({ ...d, value: d.temp }))} dataKey="temp" fill="hsl(220 70% 25%)" name="Temp (°C)" />
            <Scatter data={chartData.map(d => ({ ...d, value: d.humidity }))} dataKey="humidity" fill="hsl(200 80% 55%)" name="Humidity (%)" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Irradiance & Energy - 2 Line Charts */}
      <div className="card-solar">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Irradiance & Energy (Line Chart)</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={55} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line yAxisId="right" type="monotone" dataKey="irradiance" stroke="hsl(42 100% 50%)" strokeWidth={2} dot={{ r: 3 }} name="Irradiance (W/m²)" />
            <Line yAxisId="left" type="monotone" dataKey="energy" stroke="hsl(155 70% 45%)" strokeWidth={2} dot={{ r: 3 }} name="Energy (kWh)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Irradiance vs Temperature - Scatter */}
      <div className="card-solar">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Irradiance vs Temperature (Scatter)</h4>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
            <XAxis dataKey="irradiance" name="Irradiance" unit=" W/m²" tick={{ fontSize: 11 }} />
            <YAxis dataKey="temp" name="Temp" unit="°C" tick={{ fontSize: 11 }} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={chartData} fill="hsl(42 100% 50%)" name="Daily Readings" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Dust Level & Rainfall - Scatter dots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-solar">
          <h4 className="text-sm font-medium text-muted-foreground mb-4">Dust Level (Daily Dots)</h4>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
              <XAxis dataKey="name" name="Date" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={55} />
              <YAxis dataKey="dust" tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={chartData} fill="hsl(36 100% 55%)" name="Dust Level" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="card-solar">
          <h4 className="text-sm font-medium text-muted-foreground mb-4">Rainfall (Daily Dots)</h4>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
              <XAxis dataKey="name" name="Date" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={55} />
              <YAxis dataKey="rainfall" tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={chartData} fill="hsl(200 80% 55%)" name="Rainfall (mm)" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Data Table */}
      <div className="card-solar overflow-x-auto">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">📋 Daily Detailed Data Table — {systemKw} kW System</h4>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-2 font-semibold text-foreground">Date</th>
              <th className="text-right py-3 px-2 font-semibold text-foreground">Energy (kWh)</th>
              <th className="text-right py-3 px-2 font-semibold text-foreground">Temp (°C)</th>
              <th className="text-right py-3 px-2 font-semibold text-foreground">Humidity (%)</th>
              <th className="text-right py-3 px-2 font-semibold text-foreground">Irradiance (W/m²)</th>
              <th className="text-right py-3 px-2 font-semibold text-foreground">Dust</th>
              <th className="text-right py-3 px-2 font-semibold text-foreground">Rainfall (mm)</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row, i) => (
              <tr key={row.name} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-muted/30" : ""}`}>
                <td className="py-2 px-2 font-medium text-foreground">{row.name}</td>
                <td className="py-2 px-2 text-right tabular-nums">{row.energy}</td>
                <td className="py-2 px-2 text-right tabular-nums">{row.temp}</td>
                <td className="py-2 px-2 text-right tabular-nums">{row.humidity}</td>
                <td className="py-2 px-2 text-right tabular-nums">{row.irradiance}</td>
                <td className="py-2 px-2 text-right tabular-nums">{row.dust}</td>
                <td className="py-2 px-2 text-right tabular-nums">{row.rainfall}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border font-semibold">
              <td className="py-2.5 px-2 text-foreground">Summary ({chartData.length} days)</td>
              <td className="py-2.5 px-2 text-right tabular-nums">{stats.totalEnergy}</td>
              <td className="py-2.5 px-2 text-right tabular-nums">{stats.avgTemp}</td>
              <td className="py-2.5 px-2 text-right tabular-nums">{stats.avgHumidity}</td>
              <td className="py-2.5 px-2 text-right tabular-nums">{stats.avgIrradiance}</td>
              <td className="py-2.5 px-2 text-right tabular-nums">{stats.avgDust}</td>
              <td className="py-2.5 px-2 text-right tabular-nums">{stats.avgRainfall}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
