import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchSitesSummary, fetchAggregateData, fetchNearestLocation } from "@/services/api";
import type { SiteSummary, AggregateResponse, SolarRecord } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Zap, Thermometer, Droplets, Sun, Wind, CloudRain } from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { MapPicker } from "@/components/MapPicker";
import { DailyCharts } from "@/components/DailyCharts";
import { MonthlyCharts } from "@/components/MonthlyCharts";
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";

const AdminSiteDetail = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const [site, setSite] = useState<SiteSummary | null>(null);
  const [dailyData, setDailyData] = useState<AggregateResponse | null>(null);
  const [monthlyData, setMonthlyData] = useState<AggregateResponse | null>(null);
  const [records, setRecords] = useState<SolarRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEnergy, setTotalEnergy] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const sites = await fetchSitesSummary();
        const found = sites.find((s) => s.site === siteId);
        if (!found) {
          toast({ title: "Not Found", description: "Site not found.", variant: "destructive" });
          setLoading(false);
          return;
        }
        setSite(found);

        const [daily, monthly, nearest] = await Promise.all([
          fetchAggregateData(found.latitude, found.longitude, "daily"),
          fetchAggregateData(found.latitude, found.longitude, "monthly"),
          fetchNearestLocation(found.latitude, found.longitude),
        ]);

        setDailyData(daily);
        setMonthlyData(monthly);
        setRecords(nearest || []);

        if (daily) {
          const total = Object.values(daily).reduce((s, v) => s + v.total_predicted_kwh_per5min, 0);
          setTotalEnergy(+total.toFixed(2));
        }
      } catch (e: any) {
        toast({ title: "API Error", description: e?.message || "Failed to load.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [siteId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-solar-gold" />
        <span className="ml-3 text-muted-foreground">Loading site data...</span>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Site not found.</p>
        <Link to="/admin/sites"><Button variant="outline" className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Sites</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/admin/sites">
          <Button variant="outline" size="sm"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
        </Link>
        <div>
          <h2 className="text-xl font-bold text-foreground">{site.site} — {site.customer}</h2>
          <p className="text-sm text-muted-foreground">{site.latitude.toFixed(4)}, {site.longitude.toFixed(4)} · Since {site.first_date}</p>
        </div>
      </div>

      {/* Total Energy Focus */}
      <div className="card-solar gradient-gold text-center py-8">
        <Zap className="h-10 w-10 mx-auto mb-2 text-primary" />
        <p className="text-sm font-medium text-primary/70 uppercase tracking-wide">Total Predicted Energy</p>
        <p className="text-5xl font-extrabold text-primary tracking-tight mt-1">{totalEnergy}</p>
        <p className="text-lg font-semibold text-primary/80 mt-1">kWh</p>
      </div>

      {/* Site Map */}
      <div className="card-solar p-0 overflow-hidden">
        <MapPicker
          lat={site.latitude}
          lng={site.longitude}
          onLocationSelect={() => {}}
          height="300px"
          readonly
          markers={[{ lat: site.latitude, lng: site.longitude, label: `<b>${site.site}</b><br>${site.customer}` }]}
        />
      </div>

      {/* 5-Min Records Table */}
      {records.length > 0 && (
        <div className="card-solar overflow-x-auto">
          <h4 className="text-sm font-medium text-muted-foreground mb-4">⏱️ Latest 5-Min Records</h4>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 px-2 font-semibold text-foreground">Date</th>
                <th className="text-left py-2.5 px-2 font-semibold text-foreground">Time</th>
                <th className="text-right py-2.5 px-2 font-semibold text-foreground">Temp (°C)</th>
                <th className="text-right py-2.5 px-2 font-semibold text-foreground">Humidity (%)</th>
                <th className="text-right py-2.5 px-2 font-semibold text-foreground">Irradiance</th>
                <th className="text-right py-2.5 px-2 font-semibold text-foreground">Dust</th>
                <th className="text-right py-2.5 px-2 font-semibold text-foreground">Rainfall</th>
                <th className="text-right py-2.5 px-2 font-semibold text-foreground">kWh/5min</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={`${r.date}-${r.time}-${i}`} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-muted/30" : ""}`}>
                  <td className="py-2 px-2 font-medium">{r.date}</td>
                  <td className="py-2 px-2">{r.time}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{r.temperature}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{r.humidity}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{r.irradiance}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{r.dust_level}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{r.rainfall}</td>
                  <td className="py-2 px-2 text-right tabular-nums font-semibold">{r.predicted_kwh_per5min}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Daily Charts */}
      {dailyData && <DailyCharts data={dailyData} />}

      {/* Monthly Charts */}
      {monthlyData && <MonthlyCharts data={monthlyData} />}
    </div>
  );
};

export default AdminSiteDetail;
