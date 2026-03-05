import { useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { KPICard } from "./KPICard";
import { Zap, Thermometer, Droplets, Sun, Wind, CloudRain } from "lucide-react";
import type { AggregateResponse } from "@/services/api";

interface MonthlyChartsProps {
  data: AggregateResponse;
  scaleFactor?: number;
  systemKw?: number;
}

export const MonthlyCharts = ({ data, scaleFactor = 1, systemKw = 5 }: MonthlyChartsProps) => {
  const chartData = useMemo(
    () =>
      Object.entries(data)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, v]) => ({
          name: key,
          energy: +(v.total_predicted_kwh_per5min * scaleFactor).toFixed(2),
          temp: +v.average_temperature.toFixed(2),
          irradiance: +v.average_irradiance.toFixed(2),
          humidity: +v.average_humidity.toFixed(2),
          dust: +v.average_dust_level.toFixed(4),
          rainfall: +v.average_rainfall.toFixed(2),
        })),
    [data, scaleFactor]
  );

  const totals = useMemo(() => {
    const totalEnergy = chartData.reduce((s, d) => s + d.energy, 0);
    const avgTemp = chartData.reduce((s, d) => s + d.temp, 0) / (chartData.length || 1);
    const avgHumidity = chartData.reduce((s, d) => s + d.humidity, 0) / (chartData.length || 1);
    const avgIrradiance = chartData.reduce((s, d) => s + d.irradiance, 0) / (chartData.length || 1);
    const avgDust = chartData.reduce((s, d) => s + d.dust, 0) / (chartData.length || 1);
    const avgRainfall = chartData.reduce((s, d) => s + d.rainfall, 0) / (chartData.length || 1);
    return { totalEnergy: +totalEnergy.toFixed(2), avgTemp: +avgTemp.toFixed(2), avgHumidity: +avgHumidity.toFixed(2), avgIrradiance: +avgIrradiance.toFixed(2), avgDust: +avgDust.toFixed(4), avgRainfall: +avgRainfall.toFixed(2) };
  }, [chartData]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-foreground">📊 Monthly Summary</h3>
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{systemKw} kW System</span>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title="Total Energy" value={totals.totalEnergy} unit="kWh" icon={Zap} color="green" />
        <KPICard title="Avg Temperature" value={totals.avgTemp} unit="°C" icon={Thermometer} color="gold" />
        <KPICard title="Avg Humidity" value={totals.avgHumidity} unit="%" icon={Droplets} color="sky" />
        <KPICard title="Avg Irradiance" value={totals.avgIrradiance} unit="W/m²" icon={Sun} color="gold" />
        <KPICard title="Avg Dust Level" value={totals.avgDust} icon={Wind} color="blue" />
        <KPICard title="Avg Rainfall" value={totals.avgRainfall} unit="mm" icon={CloudRain} color="sky" />
      </div>

      {/* Monthly Energy Bar */}
      <div className="card-solar">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Monthly Energy Production — {systemKw} kW System (Bar)</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="energy" fill="hsl(42 100% 50%)" radius={[6, 6, 0, 0]} name="Energy (kWh)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Irradiance & Energy Lines */}
      <div className="card-solar">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Irradiance & Energy (Line Chart)</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="energy" stroke="hsl(155 70% 45%)" strokeWidth={2} dot={{ r: 4 }} name="Energy (kWh)" />
            <Line yAxisId="right" type="monotone" dataKey="irradiance" stroke="hsl(42 100% 50%)" strokeWidth={2} dot={{ r: 4 }} name="Irradiance (W/m²)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Data Table */}
      <div className="card-solar overflow-x-auto">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">📋 Monthly Detailed Data Table — {systemKw} kW System</h4>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-3 font-semibold text-foreground">Month</th>
              <th className="text-right py-3 px-3 font-semibold text-foreground">Energy (kWh)</th>
              <th className="text-right py-3 px-3 font-semibold text-foreground">Temp (°C)</th>
              <th className="text-right py-3 px-3 font-semibold text-foreground">Humidity (%)</th>
              <th className="text-right py-3 px-3 font-semibold text-foreground">Irradiance (W/m²)</th>
              <th className="text-right py-3 px-3 font-semibold text-foreground">Dust Level</th>
              <th className="text-right py-3 px-3 font-semibold text-foreground">Rainfall (mm)</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row, i) => (
              <tr key={row.name} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-muted/30" : ""}`}>
                <td className="py-2.5 px-3 font-medium text-foreground">{row.name}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{row.energy}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{row.temp}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{row.humidity}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{row.irradiance}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{row.dust}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{row.rainfall}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border font-semibold">
              <td className="py-2.5 px-3 text-foreground">Summary</td>
              <td className="py-2.5 px-3 text-right tabular-nums">{totals.totalEnergy}</td>
              <td className="py-2.5 px-3 text-right tabular-nums">{totals.avgTemp}</td>
              <td className="py-2.5 px-3 text-right tabular-nums">{totals.avgHumidity}</td>
              <td className="py-2.5 px-3 text-right tabular-nums">{totals.avgIrradiance}</td>
              <td className="py-2.5 px-3 text-right tabular-nums">{totals.avgDust}</td>
              <td className="py-2.5 px-3 text-right tabular-nums">{totals.avgRainfall}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
