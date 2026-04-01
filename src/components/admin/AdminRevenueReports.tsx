import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileText, Download, TrendingUp, DollarSign, ArrowLeftRight, RotateCcw } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Transaction {
  id: string;
  amount: number;
  fee: number;
  status: string;
  provider: string;
  created_at: string;
  merchants?: { name: string } | null;
}

export default function AdminRevenueReports() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [period, setPeriod] = useState("30d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [period]);

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case "7d": return subDays(now, 7);
      case "30d": return subDays(now, 30);
      case "this_month": return startOfMonth(now);
      case "last_month": return startOfMonth(subMonths(now, 1));
      default: return subDays(now, 30);
    }
  };

  const getEndDate = () => {
    if (period === "last_month") return endOfMonth(subMonths(new Date(), 1));
    return new Date();
  };

  const loadData = async () => {
    setLoading(true);
    const from = getDateRange().toISOString();
    const to = getEndDate().toISOString();

    const { data } = await supabase
      .from("transactions")
      .select("id, amount, fee, status, provider, created_at, merchants(name)")
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: true });

    setTransactions(data || []);
    setLoading(false);
  };

  const stats = useMemo(() => {
    const completed = transactions.filter((t) => t.status === "completed");
    const totalVolume = completed.reduce((s, t) => s + t.amount, 0);
    const totalFees = completed.reduce((s, t) => s + t.fee, 0);
    const avgTx = completed.length ? totalVolume / completed.length : 0;
    return { totalVolume, totalFees, count: completed.length, avgTx };
  }, [transactions]);

  const chartData = useMemo(() => {
    const map = new Map<string, { date: string; volume: number; fees: number; count: number }>();
    transactions
      .filter((t) => t.status === "completed")
      .forEach((t) => {
        const day = format(new Date(t.created_at), "MMM dd");
        const entry = map.get(day) || { date: day, volume: 0, fees: 0, count: 0 };
        entry.volume += t.amount;
        entry.fees += t.fee;
        entry.count += 1;
        map.set(day, entry);
      });
    return Array.from(map.values());
  }, [transactions]);

  const exportCSV = () => {
    const completed = transactions.filter((t) => t.status === "completed");
    const header = "Date,Merchant,Amount,Fee,Provider,Status,Reference\n";
    const rows = completed
      .map((t) =>
        `${format(new Date(t.created_at), "yyyy-MM-dd HH:mm")},${(t.merchants as any)?.name || ""},${t.amount},${t.fee},${t.provider},${t.status},${t.id}`
      )
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue-report-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  const fmtK = (n: number) => (n >= 1000 ? `K${(n / 1000).toFixed(1)}` : n.toFixed(0));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Revenue Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Platform revenue analytics & export</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="this_month">This month</SelectItem>
              <SelectItem value="last_month">Last month</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={loading}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Volume", value: `ZMW ${fmtK(stats.totalVolume)}`, icon: TrendingUp, color: "text-green-600" },
          { label: "Total Fees", value: `ZMW ${fmtK(stats.totalFees)}`, icon: DollarSign, color: "text-primary" },
          { label: "Transactions", value: stats.count.toString(), icon: ArrowLeftRight, color: "text-blue-600" },
          { label: "Avg Transaction", value: `ZMW ${stats.avgTx.toFixed(0)}`, icon: RotateCcw, color: "text-orange-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-lg font-bold">{loading ? "..." : s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue Over Time</CardTitle>
          <CardDescription>Daily volume and fee earnings</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No data for this period</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="volume" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.2)" name="Volume" />
                <Area type="monotone" dataKey="fees" stackId="2" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2)/0.2)" name="Fees" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Provider breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">By Provider</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const byProvider = new Map<string, { volume: number; fees: number; count: number }>();
            transactions
              .filter((t) => t.status === "completed")
              .forEach((t) => {
                const e = byProvider.get(t.provider) || { volume: 0, fees: 0, count: 0 };
                e.volume += t.amount;
                e.fees += t.fee;
                e.count += 1;
                byProvider.set(t.provider, e);
              });
            const entries = Array.from(byProvider.entries());
            if (!entries.length) return <p className="text-sm text-muted-foreground text-center py-4">No data</p>;
            return (
              <div className="space-y-2">
                {entries.map(([provider, data]) => (
                  <div key={provider} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{provider}</Badge>
                      <span className="text-xs text-muted-foreground">{data.count} txns</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">ZMW {fmtK(data.volume)}</p>
                      <p className="text-[10px] text-muted-foreground">Fees: ZMW {fmtK(data.fees)}</p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
