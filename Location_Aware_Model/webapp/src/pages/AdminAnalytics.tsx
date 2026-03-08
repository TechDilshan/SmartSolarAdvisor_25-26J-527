import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Loader2 } from "lucide-react";
import { fetchSitesSummary, fetchAggregateData } from "@/services/api";
import type { SiteSummary, AggregateResponse } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const AdminAnalytics = () => {
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [dailyData, setDailyData] = useState<AggregateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [compareSite1, setCompareSite1] = useState("");
  const [compareSite2, setCompareSite2] = useState("");
  const [compareData1, setCompareData1] = useState<AggregateResponse | null>(null);
  const [compareData2, setCompareData2] = useState<AggregateResponse | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [tableDateFrom, setTableDateFrom] = useState("");
  const [tableDateTo, setTableDateTo] = useState("");
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
        toast({ title: "API Error", description: e?.message || "Failed to load.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const dailyChart = useMemo(() => {
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

  // Site comparison using daily data
  const handleCompare = async () => {
    if (!compareSite1 || !compareSite2) return;
    const s1 = sites.find((s) => s.site === compareSite1);
    const s2 = sites.find((s) => s.site === compareSite2);
    if (!s1 || !s2) return;
    setCompareLoading(true);
    try {
      const [d1, d2] = await Promise.all([
        fetchAggregateData(s1.latitude, s1.longitude, "daily"),
        fetchAggregateData(s2.latitude, s2.longitude, "daily"),
      ]);
      setCompareData1(d1);
      setCompareData2(d2);
    } catch (e: any) {
      toast({ title: "Compare Error", description: e?.message || "Failed.", variant: "destructive" });
    } finally {
      setCompareLoading(false);
    }
  };

  const comparisonChart = useMemo(() => {
    if (!compareData1 || !compareData2) return [];
    const allKeys = new Set([...Object.keys(compareData1), ...Object.keys(compareData2)]);
    return [...allKeys].sort().map((key) => ({
      date: key,
      energy1: +(compareData1[key]?.total_predicted_kwh_per5min ?? 0).toFixed(4),
      energy2: +(compareData2[key]?.total_predicted_kwh_per5min ?? 0).toFixed(4),
      irradiance1: +(compareData1[key]?.average_irradiance ?? 0).toFixed(2),
      irradiance2: +(compareData2[key]?.average_irradiance ?? 0).toFixed(2),
      temp1: +(compareData1[key]?.average_temperature ?? 0).toFixed(2),
      temp2: +(compareData2[key]?.average_temperature ?? 0).toFixed(2),
    }));
  }, [compareData1, compareData2]);

  const filteredDailyChart = useMemo(() => {
    if (!tableDateFrom && !tableDateTo) return dailyChart;
    return dailyChart.filter((row) => {
      const d = row.date || "";
      if (tableDateFrom && d < tableDateFrom) return false;
      if (tableDateTo && d > tableDateTo) return false;
      return true;
    });
  }, [dailyChart, tableDateFrom, tableDateTo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-solar-gold" />
        <span className="ml-3 text-muted-foreground">Loading analytics from API...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <h3 className="text-lg font-semibold text-foreground">📊 System Analytics — Daily Data</h3>

      {/* Daily Energy Bar */}
      <div className="card-solar">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Daily Energy Production</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dailyChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
            <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={55} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="energy" fill="hsl(42 100% 50%)" radius={[4, 4, 0, 0]} name="Energy (kWh)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Site Comparison */}
      <div className="card-solar">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">🔄 Site Comparison (Daily Energy)</h4>
        <div className="flex flex-wrap gap-3 mb-4 items-end">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Site 1</span>
            <Select value={compareSite1} onValueChange={setCompareSite1}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Select site" /></SelectTrigger>
              <SelectContent>
                {sites.map((s) => (<SelectItem key={s.site} value={s.site}>{s.site} ({s.customer})</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Site 2</span>
            <Select value={compareSite2} onValueChange={setCompareSite2}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Select site" /></SelectTrigger>
              <SelectContent>
                {sites.map((s) => (<SelectItem key={s.site} value={s.site}>{s.site} ({s.customer})</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCompare} disabled={!compareSite1 || !compareSite2 || compareLoading}>
            {compareLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Compare
          </Button>
        </div>

        {comparisonChart.length > 0 && (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={55} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="energy1" fill="hsl(42 100% 50%)" name={compareSite1} radius={[4, 4, 0, 0]} />
              <Bar dataKey="energy2" fill="hsl(220 70% 25%)" name={compareSite2} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Daily Summary Table with date filter */}
      <div className="card-solar overflow-x-auto">
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <h4 className="text-sm font-medium text-muted-foreground">📋 Daily Summary Table</h4>
          <div className="flex flex-wrap items-end gap-3 ml-auto">
            <div className="flex items-center gap-2">
              <Label htmlFor="analytics-date-from" className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
              <Input id="analytics-date-from" type="date" value={tableDateFrom} onChange={(e) => setTableDateFrom(e.target.value)} className="w-36 h-8 text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="analytics-date-to" className="text-xs text-muted-foreground whitespace-nowrap">To</Label>
              <Input id="analytics-date-to" type="date" value={tableDateTo} onChange={(e) => setTableDateTo(e.target.value)} className="w-36 h-8 text-sm" />
            </div>
          </div>
        </div>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2.5 px-3 font-semibold text-foreground">Date</th>
              <th className="text-right py-2.5 px-3 font-semibold text-foreground">Energy (kWh)</th>
              <th className="text-right py-2.5 px-3 font-semibold text-foreground">Irradiance</th>
              <th className="text-right py-2.5 px-3 font-semibold text-foreground">Temp (°C)</th>
              <th className="text-right py-2.5 px-3 font-semibold text-foreground">Humidity (%)</th>
              <th className="text-right py-2.5 px-3 font-semibold text-foreground">Dust</th>
              <th className="text-right py-2.5 px-3 font-semibold text-foreground">Rainfall</th>
            </tr>
          </thead>
          <tbody>
            {filteredDailyChart.map((row, i) => (
              <tr key={row.date} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-muted/30" : ""}`}>
                <td className="py-2 px-3 font-medium text-foreground">{row.date}</td>
                <td className="py-2 px-3 text-right tabular-nums">{row.energy}</td>
                <td className="py-2 px-3 text-right tabular-nums">{row.irradiance}</td>
                <td className="py-2 px-3 text-right tabular-nums">{row.temp}</td>
                <td className="py-2 px-3 text-right tabular-nums">{row.humidity}</td>
                <td className="py-2 px-3 text-right tabular-nums">{row.dust}</td>
                <td className="py-2 px-3 text-right tabular-nums">{row.rainfall}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredDailyChart.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">No rows match the selected date range.</p>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics;
