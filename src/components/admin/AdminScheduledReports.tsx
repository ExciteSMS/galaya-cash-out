import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar, TrendingUp, Users, AlertTriangle } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";

type ReportPeriod = "today" | "7d" | "30d";

export default function AdminScheduledReports() {
  const [period, setPeriod] = useState<ReportPeriod>("7d");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const since = period === "today" ? startOfDay(new Date()).toISOString()
        : period === "7d" ? subDays(new Date(), 7).toISOString()
        : subDays(new Date(), 30).toISOString();

      const [txRes, mRes] = await Promise.all([
        supabase.from("transactions").select("*").gte("created_at", since),
        supabase.from("merchants").select("id, name, created_at, status"),
      ]);
      setTransactions(txRes.data || []);
      setMerchants(mRes.data || []);
      setLoading(false);
    };
    load();
  }, [period]);

  const stats = useMemo(() => {
    const success = transactions.filter(t => t.status === "success");
    const failed = transactions.filter(t => t.status === "failed");
    const totalVolume = success.reduce((s, t) => s + t.amount, 0);
    const totalFees = success.reduce((s, t) => s + t.fee, 0);
    const since = period === "today" ? startOfDay(new Date()).toISOString()
      : period === "7d" ? subDays(new Date(), 7).toISOString()
      : subDays(new Date(), 30).toISOString();
    const newMerchants = merchants.filter(m => m.created_at >= since);
    return { success: success.length, failed: failed.length, totalVolume, totalFees, newMerchants: newMerchants.length, total: transactions.length };
  }, [transactions, merchants, period]);

  const exportReport = () => {
    const lines = [
      `Galaya Platform Report — ${period === "today" ? "Today" : period === "7d" ? "Last 7 Days" : "Last 30 Days"}`,
      `Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}`,
      "",
      `Total Transactions: ${stats.total}`,
      `Successful: ${stats.success}`,
      `Failed: ${stats.failed}`,
      `Success Rate: ${stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0}%`,
      `Total Volume: K${stats.totalVolume.toLocaleString()}`,
      `Total Fees Earned: K${stats.totalFees.toLocaleString()}`,
      `New Merchants: ${stats.newMerchants}`,
      "",
      "--- Transaction Detail ---",
      "Date,Phone,Provider,Amount,Fee,Status",
      ...transactions.map(t => `${format(new Date(t.created_at), "yyyy-MM-dd HH:mm")},${t.phone},${t.provider},${t.amount},${t.fee},${t.status}`),
    ].join("\n");
    const blob = new Blob([lines], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `galaya-report-${period}-${format(new Date(), "yyyyMMdd")}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> Scheduled Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Auto-generated platform summaries</p>
        </div>
        <div className="flex gap-2">
          {(["today", "7d", "30d"] as ReportPeriod[]).map(p => (
            <Button key={p} size="sm" variant={period === p ? "default" : "outline"} onClick={() => setPeriod(p)}>
              {p === "today" ? "Today" : p === "7d" ? "7 Days" : "30 Days"}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><TrendingUp className="w-5 h-5 text-primary mb-1" /><p className="text-2xl font-bold text-foreground">K{stats.totalVolume.toLocaleString()}</p><p className="text-xs text-muted-foreground">Volume</p></CardContent></Card>
        <Card><CardContent className="p-4"><Calendar className="w-5 h-5 text-primary mb-1" /><p className="text-2xl font-bold text-foreground">{stats.success}</p><p className="text-xs text-muted-foreground">Successful Txns</p></CardContent></Card>
        <Card><CardContent className="p-4"><AlertTriangle className="w-5 h-5 text-destructive mb-1" /><p className="text-2xl font-bold text-foreground">{stats.failed}</p><p className="text-xs text-muted-foreground">Failed Txns</p></CardContent></Card>
        <Card><CardContent className="p-4"><Users className="w-5 h-5 text-primary mb-1" /><p className="text-2xl font-bold text-foreground">{stats.newMerchants}</p><p className="text-xs text-muted-foreground">New Merchants</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Period</span><span className="font-medium text-foreground">{period === "today" ? "Today" : period === "7d" ? "Last 7 Days" : "Last 30 Days"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Success Rate</span><span className="font-medium text-foreground">{stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0}%</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Total Fees Earned</span><span className="font-medium text-primary">K{stats.totalFees.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Avg Transaction</span><span className="font-medium text-foreground">K{stats.success > 0 ? Math.round(stats.totalVolume / stats.success).toLocaleString() : 0}</span></div>
        </CardContent>
      </Card>

      <Button onClick={exportReport} className="w-full sm:w-auto"><Download className="h-4 w-4 mr-2" /> Download Full Report (CSV)</Button>
    </div>
  );
}
