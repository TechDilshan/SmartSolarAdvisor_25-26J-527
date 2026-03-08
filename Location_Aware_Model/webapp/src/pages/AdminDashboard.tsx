import { useState, useEffect, useMemo } from "react";
import { Zap, Users, Activity, Sun, Thermometer, Droplets } from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { MapPicker } from "@/components/MapPicker";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Loader2 } from "lucide-react";
import { fetchSitesSummary, fetchAggregateData } from "@/services/api";
import type { SiteSummary, AggregateResponse } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const COLORS = [
  "hsl(42 100% 50%)", "hsl(220 70% 25%)", "hsl(155 70% 45%)",
  "hsl(200 80% 55%)", "hsl(36 100% 55%)", "hsl(0 84% 60%)",
];

const AdminDashboard = () => {
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [dailyData, setDailyData] = useState<AggregateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const sitesData = await fetchSitesSummary();
        setSites(sitesData);
        if (sitesData.length > 0) {
          const daily = await fetchAggregateData(sitesData[0].latitude, sitesData[0].longitude, "daily");
          setDailyData(daily);
        }
      } catch (e: any) {
        toast({ title: "API Error", description: e?.message || "Failed to load data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const chartData = useMemo(() => {
    if (!dailyData) return [];
    return Object.entries(dailyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({
        date: key,
        energy: +v.total_predicted_kwh_per5min.toFixed(4),
        irradiance: +v.average_irradiance.toFixed(2),
        temp: +v.average_temperature.toFixed(2),
        humidity: +v.average_humidity.toFixed(2),
        dust: +v.average_dust_level.toFixed(4),
        rainfall: +v.average_rainfall.toFixed(2),
      }));
  }, [dailyData]);

  const totals = useMemo(() => {
    if (!chartData.length) return { totalEnergy: 0, avgIrradiance: 0, avgTemp: 0, avgHumidity: 0 };
    const totalEnergy = chartData.reduce((s, d) => s + d.energy, 0);
    const avgIrradiance = chartData.reduce((s, d) => s + d.irradiance, 0) / chartData.length;
    const avgTemp = chartData.reduce((s, d) => s + d.temp, 0) / chartData.length;
    const avgHumidity = chartData.reduce((s, d) => s + d.humidity, 0) / chartData.length;
    return { totalEnergy: +totalEnergy.toFixed(2), avgIrradiance: +avgIrradiance.toFixed(2), avgTemp: +avgTemp.toFixed(2), avgHumidity: +avgHumidity.toFixed(2) };
  }, [chartData]);

  const uniqueCustomers = useMemo(() => new Set(sites.map((s) => s.customer)).size, [sites]);

  const sitesByCustomer = useMemo(() => {
    const map: Record<string, number> = {};
    sites.forEach((s) => { map[s.customer] = (map[s.customer] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [sites]);

  const mapMarkers = useMemo(() => sites.map(s => ({
    lat: s.latitude,
    lng: s.longitude,
    label: `<b>${s.site}</b><br>${s.customer}<br>${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}`,
  })), [sites]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-solar-gold" />
        <span className="ml-3 text-muted-foreground">Loading system data from API...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title="Total Sites" value={sites.length} icon={Activity} color="blue" />
        <KPICard title="Total Customers" value={uniqueCustomers} icon={Users} color="green" />
        <KPICard title="Total Energy" value={totals.totalEnergy} unit="kWh" icon={Zap} color="gold" />
        <KPICard title="Avg Irradiance" value={totals.avgIrradiance} unit="W/m²" icon={Sun} color="gold" />
        <KPICard title="Avg Temperature" value={totals.avgTemp} unit="°C" icon={Thermometer} color="sky" />
        <KPICard title="Avg Humidity" value={totals.avgHumidity} unit="%" icon={Droplets} color="sky" />
      </div>

      {/* Customer Locations Map */}
      <div className="card-solar">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">📍 Customer Site Locations</h4>
        <div className="rounded-xl overflow-hidden border border-border">
          <MapPicker
            lat={null}
            lng={null}
            onLocationSelect={() => {}}
            height="400px"
            readonly
            markers={mapMarkers}
          />
        </div>
      </div>

      {/* Daily Energy Bar + Sites Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-solar">
          <h4 className="text-sm font-medium text-muted-foreground mb-4">Daily Energy Production (Bar)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={55} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="energy" fill="hsl(42 100% 50%)" radius={[4, 4, 0, 0]} name="Energy (kWh)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card-solar">
          <h4 className="text-sm font-medium text-muted-foreground mb-4">Sites by Customer (Pie)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={sitesByCustomer} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {sitesByCustomer.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Temp/Humidity scatter + Irradiance vs Temp scatter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-solar">
          <h4 className="text-sm font-medium text-muted-foreground mb-4">Temperature & Humidity (Daily Dots)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
              <XAxis dataKey="date" name="Date" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={55} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Legend />
              <Scatter data={chartData} dataKey="temp" fill="hsl(220 70% 25%)" name="Temp (°C)" />
              <Scatter data={chartData} dataKey="humidity" fill="hsl(200 80% 55%)" name="Humidity (%)" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="card-solar">
          <h4 className="text-sm font-medium text-muted-foreground mb-4">Irradiance vs Energy (Scatter)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
              <XAxis dataKey="irradiance" name="Irradiance" unit=" W/m²" tick={{ fontSize: 11 }} />
              <YAxis dataKey="energy" name="Energy" unit=" kWh" tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={chartData} fill="hsl(42 100% 50%)" name="Daily Data" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Irradiance Line */}
      <div className="card-solar">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Daily Irradiance & Energy (Line)</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
            <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={55} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line yAxisId="right" type="monotone" dataKey="irradiance" stroke="hsl(42 100% 50%)" strokeWidth={2} dot={{ r: 3 }} name="Irradiance (W/m²)" />
            <Line yAxisId="left" type="monotone" dataKey="energy" stroke="hsl(155 70% 45%)" strokeWidth={2} dot={{ r: 3 }} name="Energy (kWh)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Sites List Table */}
      <div className="card-solar overflow-x-auto">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">📍 All Registered Sites</h4>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-3 font-semibold text-foreground">Customer</th>
              <th className="text-left py-3 px-3 font-semibold text-foreground">Site</th>
              <th className="text-right py-3 px-3 font-semibold text-foreground">Latitude</th>
              <th className="text-right py-3 px-3 font-semibold text-foreground">Longitude</th>
              <th className="text-left py-3 px-3 font-semibold text-foreground">First Date</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((s, i) => (
              <tr key={s.site} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-muted/30" : ""}`}>
                <td className="py-2.5 px-3 font-medium text-foreground">{s.customer}</td>
                <td className="py-2.5 px-3">{s.site}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{s.latitude.toFixed(4)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{s.longitude.toFixed(4)}</td>
                <td className="py-2.5 px-3">{s.first_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
