import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3, TrendingUp, Receipt, Trophy } from "lucide-react";
import { getTransactions, Transaction } from "@/lib/api";
import { format, subDays, isSameDay } from "date-fns";

export default function SalesAnalytics({ onBack }: { onBack: () => void }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    getTransactions().then((t) => { setTransactions(t); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const successful = useMemo(
    () => transactions.filter((t) => t.status === "success"),
    [transactions]
  );

  const since = subDays(new Date(), days);
  const inRange = successful.filter((t) => new Date(t.created_at) >= since);

  const totalRevenue = inRange.reduce((s, t) => s + t.amount, 0);
  const totalFees = inRange.reduce((s, t) => s + (t.fee || 0), 0);
  const avgSale = inRange.length ? totalRevenue / inRange.length : 0;

  const daily = useMemo(() => {
    const buckets: { label: string; total: number; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dayTx = successful.filter((t) => isSameDay(new Date(t.created_at), d));
      buckets.push({
        label: format(d, days > 14 ? "dd MMM" : "EEE"),
        total: dayTx.reduce((s, t) => s + t.amount, 0),
        count: dayTx.length,
      });
    }
    return buckets;
  }, [successful, days]);

  const maxDaily = Math.max(...daily.map((d) => d.total), 1);

  const byProvider = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    inRange.forEach((t) => {
      map[t.provider] = map[t.provider] || { total: 0, count: 0 };
      map[t.provider].total += t.amount;
      map[t.provider].count += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [inRange]);

  const bestDay = daily.reduce((best, d) => (d.total > best.total ? d : best), { label: "—", total: 0, count: 0 });

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" /> Sales Analytics
        </h2>
        <div className="flex gap-1">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-[11px] px-2.5 py-1 rounded-lg font-medium ${
                days === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Revenue</p>
              <p className="text-base font-bold text-foreground font-mono">K{totalRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sales</p>
              <p className="text-base font-bold text-foreground font-mono">{inRange.length}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Sale</p>
              <p className="text-base font-bold text-foreground font-mono">K{avgSale.toFixed(0)}</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 mb-4">
            <p className="text-xs font-medium text-foreground mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-primary" /> Daily revenue
            </p>
            <div className="flex items-end gap-1 h-28">
              {daily.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary/80 rounded-t"
                    style={{ height: `${Math.max((d.total / maxDaily) * 100, 2)}%` }}
                    title={`K${d.total}`}
                  />
                  <span className="text-[8px] text-muted-foreground">{d.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Trophy className="w-3 h-3 text-primary" /> Best day
              </p>
              <p className="text-sm font-bold text-foreground">{bestDay.label}</p>
              <p className="text-[11px] text-muted-foreground font-mono">K{bestDay.total.toLocaleString()} · {bestDay.count} sales</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Receipt className="w-3 h-3 text-primary" /> Fees paid
              </p>
              <p className="text-sm font-bold text-foreground font-mono">K{totalFees.toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground">across {inRange.length} sales</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-medium text-foreground mb-3">By provider</p>
            {byProvider.length === 0 ? (
              <p className="text-xs text-muted-foreground">No sales in this period.</p>
            ) : (
              <div className="space-y-2">
                {byProvider.map(([provider, stats]) => (
                  <div key={provider} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{provider}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      K{stats.total.toLocaleString()} · {stats.count} sales
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
