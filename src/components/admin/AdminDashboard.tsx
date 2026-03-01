import { useEffect, useState } from "react";
import { getAllTransactions, getAllMerchants } from "@/lib/adminApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, TrendingUp, Activity } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalFees: 0,
    totalTransactions: 0,
    totalMerchants: 0,
    successRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAllTransactions(), getAllMerchants()]).then(([txs, merchants]) => {
      const successful = txs.filter((t: any) => t.status === "success");
      setStats({
        totalRevenue: successful.reduce((s: number, t: any) => s + t.amount, 0),
        totalFees: successful.reduce((s: number, t: any) => s + t.fee, 0),
        totalTransactions: txs.length,
        totalMerchants: merchants.length,
        successRate: txs.length ? Math.round((successful.length / txs.length) * 100) : 0,
      });
      setLoading(false);
    });
  }, []);

  const cards = [
    { label: "Total Volume", value: `K${stats.totalRevenue.toLocaleString()}`, icon: DollarSign },
    { label: "Fees Earned", value: `K${stats.totalFees.toLocaleString()}`, icon: TrendingUp },
    { label: "Transactions", value: stats.totalTransactions.toString(), icon: Activity },
    { label: "Merchants", value: stats.totalMerchants.toString(), icon: Users },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-display">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Success Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${stats.successRate}%` }}
              />
            </div>
            <span className="text-sm font-bold">{stats.successRate}%</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
