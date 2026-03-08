import { useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-foreground">📈 Daily Analytics</h3>
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{systemKw} kW System</span>
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

      {/* Irradiance & Energy - Line Chart (prediction: relationship over time) */}
      <div className="card-solar">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Irradiance & Energy Over Time — for prediction</h4>
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

      {/* Irradiance vs Energy scatter — correlation for yield prediction */}
      <div className="card-solar">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Irradiance vs Energy (correlation for yield prediction)</h4>
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
            <XAxis dataKey="irradiance" name="Irradiance" unit=" W/m²" tick={{ fontSize: 11 }} />
            <YAxis dataKey="energy" name="Energy" unit=" kWh" tick={{ fontSize: 11 }} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Legend />
            <Scatter data={chartData} fill="hsl(42 100% 50%)" name="Daily (W/m² vs kWh)" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Temperature trend — affects panel efficiency / prediction */}
      <div className="card-solar">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Temperature trend (panel efficiency factor)</h4>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={55} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="temp" stroke="hsl(220 70% 45%)" strokeWidth={2} dot={{ r: 3 }} name="Avg Temp (°C)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Key factors for prediction — short summary */}
      <div className="card-solar border-primary/20 bg-primary/5">
        <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> Key factors for energy prediction
        </h4>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Irradiance (W/m²) — primary driver of generation</li>
          <li>Temperature — higher temps reduce panel efficiency</li>
          <li>Humidity & rainfall — affect soiling and diffuse light</li>
          <li>Dust — reduces output; use charts above to spot low-yield days</li>
        </ul>
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
        </table>
      </div>
    </div>
  );
};
