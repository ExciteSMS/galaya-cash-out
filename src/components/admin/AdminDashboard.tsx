import { useEffect, useState, useMemo } from "react";
import { getAllTransactions, getAllMerchants, getAllDisbursements } from "@/lib/adminApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, TrendingUp, Activity, ArrowDownToLine, Percent, Calendar } from "lucide-react";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalFees: 0,
    totalTransactions: 0,
    totalMerchants: 0,
    successRate: 0,
    totalDisbursed: 0,
    platformFeeEarned: 0,
    todayRevenue: 0,
    todayTxCount: 0,
    weekRevenue: 0,
  });
  const [recentTxs, setRecentTxs] = useState<any[]>([]);
  const [allTxs, setAllTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAllTransactions(), getAllMerchants(), getAllDisbursements()]).then(([txs, merchants, disbs]) => {
      const successful = txs.filter((t: any) => t.status === "success");
      const today = startOfDay(new Date());
      const weekAgo = subDays(today, 7);

      const todayTxs = successful.filter((t: any) => new Date(t.created_at) >= today);
      const weekTxs = successful.filter((t: any) => new Date(t.created_at) >= weekAgo);

      const successDisbs = disbs.filter((d: any) => d.status === "success");
      const totalDisbursed = successDisbs.reduce((s: number, d: any) => s + Number(d.amount), 0);
      const totalDisbFees = successDisbs.reduce((s: number, d: any) => s + Number(d.fee), 0);

      setStats({
        totalRevenue: successful.reduce((s: number, t: any) => s + t.amount, 0),
        totalFees: successful.reduce((s: number, t: any) => s + t.fee, 0),
        totalTransactions: txs.length,
        totalMerchants: merchants.length,
        successRate: txs.length ? Math.round((successful.length / txs.length) * 100) : 0,
        totalDisbursed,
        platformFeeEarned: totalDisbFees,
        todayRevenue: todayTxs.reduce((s: number, t: any) => s + t.amount, 0),
        todayTxCount: todayTxs.length,
        weekRevenue: weekTxs.reduce((s: number, t: any) => s + t.amount, 0),
      });
      setAllTxs(txs);
      setRecentTxs(txs.slice(0, 8));
      setLoading(false);
    });
  }, []);

  // Chart data: daily revenue for last 14 days
  const chartData = useMemo(() => {
    const end = new Date();
    const start = subDays(end, 13);
    const days = eachDayOfInterval({ start, end });
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const dayTxs = allTxs.filter(t => t.status === "success" && new Date(t.created_at) >= dayStart && new Date(t.created_at) < dayEnd);
      return {
        date: format(day, "dd MMM"),
        revenue: dayTxs.reduce((s, t) => s + t.amount, 0),
        fees: dayTxs.reduce((s, t) => s + t.fee, 0),
        count: dayTxs.length,
      };
    });
  }, [allTxs]);

  const cards = [
    { label: "Total Volume", value: `K${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-primary" },
    { label: "Transaction Fees", value: `K${stats.totalFees.toLocaleString()}`, icon: TrendingUp, color: "text-success" },
    { label: "Withdrawal Fees", value: `K${stats.platformFeeEarned.toFixed(2)}`, icon: Percent, color: "text-chart-4" },
    { label: "Disbursed", value: `K${stats.totalDisbursed.toLocaleString()}`, icon: ArrowDownToLine, color: "text-chart-2" },
    { label: "Transactions", value: stats.totalTransactions.toString(), icon: Activity, color: "text-chart-3" },
    { label: "Merchants", value: stats.totalMerchants.toString(), icon: Users, color: "text-chart-5" },
    { label: "Today Sales", value: `K${stats.todayRevenue.toLocaleString()}`, icon: Calendar, color: "text-primary" },
    { label: "7-Day Sales", value: `K${stats.weekRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-success" },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-display">Admin Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">14-Day Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number, name: string) => [`K${value.toLocaleString()}`, name === "revenue" ? "Revenue" : "Fees"]}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fees" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${stats.successRate}%` }} />
              </div>
              <span className="text-sm font-bold">{stats.successRate}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Revenue Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transaction fees earned</span>
              <span className="font-mono font-medium">K{stats.totalFees.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Withdrawal fees earned</span>
              <span className="font-mono font-medium">K{stats.platformFeeEarned.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="font-medium text-foreground">Total platform revenue</span>
              <span className="font-mono font-bold text-primary">K{(stats.totalFees + stats.platformFeeEarned).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-muted-foreground font-medium text-xs">Date</th>
                  <th className="text-left p-3 text-muted-foreground font-medium text-xs">Merchant</th>
                  <th className="text-left p-3 text-muted-foreground font-medium text-xs">Phone</th>
                  <th className="text-right p-3 text-muted-foreground font-medium text-xs">Amount</th>
                  <th className="text-center p-3 text-muted-foreground font-medium text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTxs.map((tx: any) => (
                  <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 text-xs">{format(new Date(tx.created_at), "dd MMM HH:mm")}</td>
                    <td className="p-3 text-xs">{tx.merchants?.name || "—"}</td>
                    <td className="p-3 text-xs font-mono">{tx.phone}</td>
                    <td className="p-3 text-right font-mono">K{tx.amount}</td>
                    <td className="p-3 text-center">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        tx.status === "success" ? "bg-success/10 text-success" :
                        tx.status === "pending" ? "bg-primary/10 text-primary" :
                        "bg-destructive/10 text-destructive"
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
