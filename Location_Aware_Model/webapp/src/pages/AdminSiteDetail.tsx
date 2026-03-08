import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchSitesSummary, fetchAggregateData, fetchNearestLocation } from "@/services/api";
import type { SiteSummary, AggregateResponse, SolarRecord } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { MapPicker } from "@/components/MapPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const AdminSiteDetail = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const [site, setSite] = useState<SiteSummary | null>(null);
  const [dailyData, setDailyData] = useState<AggregateResponse | null>(null);
  const [monthlyData, setMonthlyData] = useState<AggregateResponse | null>(null);
  const [records, setRecords] = useState<SolarRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEnergy, setTotalEnergy] = useState(0);
  const [recordsPage, setRecordsPage] = useState(0);
  const [recordsDateFrom, setRecordsDateFrom] = useState("");
  const [recordsDateTo, setRecordsDateTo] = useState("");
  const { toast } = useToast();
  const recordsPerPage = 15;

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
        setRecordsPage(0);

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

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const ak = `${a.date ?? ""} ${a.time ?? ""}`;
      const bk = `${b.date ?? ""} ${b.time ?? ""}`;
      return bk.localeCompare(ak);
    });
  }, [records]);

  const filteredByDateRecords = useMemo(() => {
    if (!recordsDateFrom && !recordsDateTo) return sortedRecords;
    return sortedRecords.filter((r) => {
      const d = r.date ?? "";
      if (recordsDateFrom && d < recordsDateFrom) return false;
      if (recordsDateTo && d > recordsDateTo) return false;
      return true;
    });
  }, [sortedRecords, recordsDateFrom, recordsDateTo]);

  const recordsTotalPages = Math.max(1, Math.ceil(filteredByDateRecords.length / recordsPerPage));
  const pagedRecords = useMemo(() => {
    const start = recordsPage * recordsPerPage;
    return filteredByDateRecords.slice(start, start + recordsPerPage);
  }, [filteredByDateRecords, recordsPage]);

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
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <h4 className="text-sm font-medium text-muted-foreground">⏱️ Latest 5-Min Records</h4>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="site-date-from" className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
                <Input id="site-date-from" type="date" value={recordsDateFrom} onChange={(e) => { setRecordsDateFrom(e.target.value); setRecordsPage(0); }} className="w-36 h-8 text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="site-date-to" className="text-xs text-muted-foreground whitespace-nowrap">To</Label>
                <Input id="site-date-to" type="date" value={recordsDateTo} onChange={(e) => { setRecordsDateTo(e.target.value); setRecordsPage(0); }} className="w-36 h-8 text-sm" />
              </div>
              <span className="text-xs text-muted-foreground">
                Showing {filteredByDateRecords.length === 0 ? 0 : recordsPage * recordsPerPage + 1}–{Math.min((recordsPage + 1) * recordsPerPage, filteredByDateRecords.length)} of {filteredByDateRecords.length}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={recordsPage === 0}
                  onClick={() => setRecordsPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={recordsPage >= recordsTotalPages - 1}
                  onClick={() => setRecordsPage((p) => Math.min(recordsTotalPages - 1, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
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
              {pagedRecords.map((r, i) => (
                <tr key={`${r.date}-${r.time}-${recordsPage}-${i}`} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-muted/30" : ""}`}>
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

    </div>
  );
};

export default AdminSiteDetail;
