import { useEffect, useState, useMemo } from "react";
import { getAllTransactions, getAllMerchants, getAllDisbursements } from "@/lib/adminApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subDays, startOfDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, startOfMonth } from "date-fns";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { TrendingUp, Users, Activity, Zap } from "lucide-react";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function AdminAnalytics() {
  const [txs, setTxs] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  useEffect(() => {
    Promise.all([getAllTransactions(), getAllMerchants()]).then(([t, m]) => {
      setTxs(t);
      setMerchants(m);
      setLoading(false);
    });
  }, []);

  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const cutoff = subDays(new Date(), days);

  // Revenue trend
  const revenueTrend = useMemo(() => {
    const end = new Date();
    const start = subDays(end, days - 1);
    const intervals = days <= 30
      ? eachDayOfInterval({ start, end })
      : eachWeekOfInterval({ start, end });

    return intervals.map((d) => {
      const periodStart = days <= 30 ? startOfDay(d) : startOfWeek(d);
      const periodEnd = new Date(periodStart.getTime() + (days <= 30 ? 86400000 : 604800000));
      const periodTxs = txs.filter(t => {
        const dt = new Date(t.created_at);
        return dt >= periodStart && dt < periodEnd;
      });
      const success = periodTxs.filter(t => t.status === "success");
      const failed = periodTxs.filter(t => t.status === "failed");
      return {
        date: format(d, days <= 30 ? "dd MMM" : "dd MMM"),
        revenue: success.reduce((s: number, t: any) => s + t.amount, 0),
        fees: success.reduce((s: number, t: any) => s + t.fee, 0),
        count: periodTxs.length,
        successRate: periodTxs.length ? Math.round((success.length / periodTxs.length) * 100) : 0,
      };
    });
  }, [txs, days]);

  // Provider distribution
  const providerData = useMemo(() => {
    const map: Record<string, number> = {};
    const periodTxs = txs.filter(t => new Date(t.created_at) >= cutoff && t.status === "success");
    periodTxs.forEach(t => { map[t.provider] = (map[t.provider] || 0) + t.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [txs, cutoff]);

  // Merchant growth
  const merchantGrowth = useMemo(() => {
    const end = new Date();
    const start = subDays(end, 89);
    const months = eachMonthOfInterval({ start, end });
    let cumulative = 0;
    return months.map((m) => {
      const monthEnd = new Date(startOfMonth(m).getTime() + 2678400000); // ~31 days
      const newInMonth = merchants.filter(me => new Date(me.created_at) >= startOfMonth(m) && new Date(me.created_at) < monthEnd).length;
      cumulative += newInMonth;
      return { month: format(m, "MMM yy"), new: newInMonth, total: cumulative };
    });
  }, [merchants]);

  // Top merchants
  const topMerchants = useMemo(() => {
    const periodTxs = txs.filter(t => new Date(t.created_at) >= cutoff && t.status === "success");
    const map: Record<string, { name: string; volume: number; count: number }> = {};
    periodTxs.forEach(t => {
      const name = t.merchants?.name || "Unknown";
      if (!map[t.merchant_id]) map[t.merchant_id] = { name, volume: 0, count: 0 };
      map[t.merchant_id].volume += t.amount;
      map[t.merchant_id].count++;
    });
    return Object.values(map).sort((a, b) => b.volume - a.volume).slice(0, 5);
  }, [txs, cutoff]);

  // Gateway success rates
  const gatewayStats = useMemo(() => {
    const periodTxs = txs.filter(t => new Date(t.created_at) >= cutoff);
    const total = periodTxs.length;
    const success = periodTxs.filter(t => t.status === "success").length;
    const failed = periodTxs.filter(t => t.status === "failed").length;
    const pending = periodTxs.filter(t => t.status === "pending").length;
    return { total, success, failed, pending, rate: total ? Math.round((success / total) * 100) : 0 };
  }, [txs, cutoff]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold font-display">Platform Analytics</h1>
        <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Period Revenue</span></div>
            <p className="text-xl font-bold">K{revenueTrend.reduce((s, d) => s + d.revenue, 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Activity className="h-4 w-4 text-chart-3" /><span className="text-xs text-muted-foreground">Transactions</span></div>
            <p className="text-xl font-bold">{gatewayStats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Zap className="h-4 w-4 text-success" /><span className="text-xs text-muted-foreground">Success Rate</span></div>
            <p className="text-xl font-bold">{gatewayStats.rate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Users className="h-4 w-4 text-chart-5" /><span className="text-xs text-muted-foreground">Active Merchants</span></div>
            <p className="text-xl font-bold">{merchants.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Revenue Trend</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number, n: string) => [`K${v.toLocaleString()}`, n === "revenue" ? "Revenue" : "Fees"]} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fees" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gateway Success Rate Over Time */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Success Rate Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v}%`, "Success Rate"]} />
                  <Line type="monotone" dataKey="successRate" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Provider Distribution */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Provider Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={providerData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                    {providerData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`K${v.toLocaleString()}`]} />
                  <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Merchant Growth */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Merchant Growth</CardTitle></CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={merchantGrowth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="new" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} name="New" />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Cumulative" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Merchants */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Top Merchants by Volume</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {topMerchants.map((m, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</div>
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.count} transactions</p>
                  </div>
                </div>
                <span className="font-mono text-sm font-bold">K{m.volume.toLocaleString()}</span>
              </div>
            ))}
            {topMerchants.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>}
          </CardContent>
        </Card>
      </div>

      {/* Gateway Stats Summary */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Gateway Performance</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{gatewayStats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success">{gatewayStats.success}</p>
              <p className="text-xs text-muted-foreground">Success</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive">{gatewayStats.failed}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{gatewayStats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
