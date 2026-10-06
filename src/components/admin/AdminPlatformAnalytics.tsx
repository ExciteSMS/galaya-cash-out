import { useEffect, useMemo, useState } from "react";
import { getAllTransactions, getAllMerchants } from "@/lib/adminApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, TrendingUp, Users, ArrowLeftRight, DollarSign } from "lucide-react";
import { format, subDays, isSameDay } from "date-fns";

export default function AdminPlatformAnalytics() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    Promise.all([getAllTransactions(), getAllMerchants()]).then(([tx, m]) => {
      setTransactions(tx);
      setMerchants(m);
      setLoading(false);
    });
  }, []);

  const since = subDays(new Date(), days);
  const inRange = transactions.filter((t) => new Date(t.created_at) >= since);
  const successful = inRange.filter((t) => t.status === "success");

  const volume = successful.reduce((s, t) => s + t.amount, 0);
  const revenue = successful.reduce((s, t) => s + (t.fee || 0), 0);
  const activeMerchants = new Set(successful.map((t) => t.merchant_id)).size;
  const successRate = inRange.length ? (successful.length / inRange.length) * 100 : 0;

  const daily = useMemo(() => {
    const buckets: { label: string; volume: number; revenue: number; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dayTx = successful.filter((t) => isSameDay(new Date(t.created_at), d));
      buckets.push({
        label: format(d, "dd MMM"),
        volume: dayTx.reduce((s, t) => s + t.amount, 0),
        revenue: dayTx.reduce((s, t) => s + (t.fee || 0), 0),
        count: dayTx.length,
      });
    }
    return buckets;
  }, [successful, days]);

  const maxVolume = Math.max(...daily.map((d) => d.volume), 1);

  const newMerchants = merchants.filter((m) => new Date(m.created_at) >= since).length;

  const topMerchants = useMemo(() => {
    const map: Record<string, { name: string; total: number; count: number }> = {};
    successful.forEach((t) => {
      const name = t.merchants?.name || "Unknown";
      map[t.merchant_id] = map[t.merchant_id] || { name, total: 0, count: 0 };
      map[t.merchant_id].total += t.amount;
      map[t.merchant_id].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [successful]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <LineChart className="h-6 w-6 text-primary" /> Platform Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Volume, revenue and merchant activity over time.</p>
        </div>
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                days === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <ArrowLeftRight className="w-3 h-3" /> Volume
            </p>
            <p className="text-xl font-bold text-foreground font-mono">K{volume.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">{successful.length} successful</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Fee revenue
            </p>
            <p className="text-xl font-bold text-foreground font-mono">K{revenue.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">{successRate.toFixed(1)}% success rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3 h-3" /> Active merchants
            </p>
            <p className="text-xl font-bold text-foreground">{activeMerchants}</p>
            <p className="text-[11px] text-muted-foreground">of {merchants.length} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> New merchants
            </p>
            <p className="text-xl font-bold text-foreground">{newMerchants}</p>
            <p className="text-[11px] text-muted-foreground">last {days} days</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily transaction volume</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-40">
            {daily.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div
                  className="w-full bg-primary/80 rounded-t"
                  style={{ height: `${Math.max((d.volume / maxVolume) * 100, 2)}%` }}
                  title={`${d.label}: K${d.volume.toLocaleString()} (${d.count} tx)`}
                />
                {days <= 30 && <span className="text-[8px] text-muted-foreground rotate-0 truncate">{d.label.split(" ")[0]}</span>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top merchants by volume</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {topMerchants.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No transactions in this period.</p>}
          {topMerchants.map((m, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground w-5">#{i + 1}</span>
                <span className="text-sm font-medium text-foreground">{m.name}</span>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                K{m.total.toLocaleString()} · {m.count} tx
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
