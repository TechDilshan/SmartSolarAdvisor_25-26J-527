import { useMemo } from "react";
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
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
    return {
      totalEnergy: +totalEnergy.toFixed(2),
      avgTemp: +avgTemp.toFixed(2),
      avgHumidity: +avgHumidity.toFixed(2),
      avgIrradiance: +avgIrradiance.toFixed(2),
      avgDust: +avgDust.toFixed(4),
      avgRainfall: +avgRainfall.toFixed(2),
    };
  }, [chartData]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card-solar">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Monthly energy production</h4>
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

      <div className="card-solar overflow-x-auto">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Monthly data</h4>
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
              <td className="py-2.5 px-3 text-foreground">
                Summary{systemKw !== 5 ? ` · ${systemKw} kW` : ""}
              </td>
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
