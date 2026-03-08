import { useMemo } from "react";
import { ArrowUpRight, TrendingUp, TrendingDown, Wallet, Hash, Calendar, BarChart3, Repeat, Star } from "lucide-react";
import MerchantTierBadge from "./MerchantTierBadge";
import { Transaction } from "@/lib/api";
import { subDays, startOfDay, eachDayOfInterval, format } from "date-fns";

interface DashboardProps {
  transactions: Transaction[];
  onNewSale: () => void;
  onRepeatSale?: (phone: string, amount: number) => void;
}

const Dashboard = ({ transactions, onNewSale, onRepeatSale }: DashboardProps) => {
  const today = new Date().toDateString();
  const yesterday = subDays(new Date(), 1).toDateString();
  const successTxs = transactions.filter((t) => t.status === "success");
  const todayTxs = successTxs.filter((t) => new Date(t.created_at).toDateString() === today);
  const yesterdayTxs = successTxs.filter((t) => new Date(t.created_at).toDateString() === yesterday);

  const todayRevenue = todayTxs.reduce((sum, t) => sum + t.amount, 0);
  const todayFees = todayTxs.reduce((sum, t) => sum + t.fee, 0);
  const todayNet = todayRevenue - todayFees;
  const yesterdayRevenue = yesterdayTxs.reduce((sum, t) => sum + t.amount, 0);

  const allRevenue = successTxs.reduce((sum, t) => sum + t.amount, 0);
  const allFees = successTxs.reduce((sum, t) => sum + t.fee, 0);
  const allNet = allRevenue - allFees;

  const revenueChange = yesterdayRevenue > 0
    ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
    : todayRevenue > 0 ? 100 : 0;

  // Weekly chart data
  const weekData = useMemo(() => {
    const end = new Date();
    const start = subDays(end, 6);
    return eachDayOfInterval({ start, end }).map(day => {
      const dayStr = day.toDateString();
      const dayTxs = successTxs.filter(t => new Date(t.created_at).toDateString() === dayStr);
      return {
        label: format(day, "EEE"),
        amount: dayTxs.reduce((s, t) => s + t.amount, 0),
      };
    });
  }, [successTxs]);

  const maxWeek = Math.max(...weekData.map(d => d.amount), 1);

  // Frequent customers (top 3)
  const frequentCustomers = useMemo(() => {
    const counts: Record<string, { phone: string; count: number; lastAmount: number; provider: string }> = {};
    successTxs.forEach(tx => {
      if (!counts[tx.phone]) counts[tx.phone] = { phone: tx.phone, count: 0, lastAmount: tx.amount, provider: tx.provider };
      counts[tx.phone].count++;
      counts[tx.phone].lastAmount = tx.amount;
      counts[tx.phone].provider = tx.provider;
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 3);
  }, [successTxs]);

  // Pending transactions count
  const pendingCount = transactions.filter(t => t.status === "pending").length;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold font-display text-primary text-glow">GALAYA POS</h1>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
            {new Date().toLocaleDateString("en-ZM", { weekday: "short", month: "short", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <div className="relative">
              <div className="w-8 h-8 rounded border border-primary/50 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[9px] font-bold flex items-center justify-center">
                {pendingCount}
              </span>
            </div>
          )}
          <div className="w-8 h-8 rounded border border-primary flex items-center justify-center text-primary font-bold text-sm text-glow">
            G
          </div>
        </div>
      </div>

      <button
        onClick={onNewSale}
        className="w-full bg-primary/10 border border-primary text-primary rounded-lg p-4 flex items-center justify-between hover:bg-primary/20 active:scale-[0.98] transition-all group"
      >
        <div className="text-left">
          <p className="font-display font-bold text-glow">NEW SALE</p>
          <p className="text-primary/60 text-xs font-mono">Accept mobile money</p>
        </div>
        <ArrowUpRight className="w-6 h-6 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </button>

      {/* Today's Stats with comparison */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Today
          </p>
          {revenueChange !== 0 && (
            <span className={`text-[9px] font-medium flex items-center gap-0.5 ${revenueChange > 0 ? "text-success" : "text-destructive"}`}>
              {revenueChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {revenueChange > 0 ? "+" : ""}{revenueChange}% vs yesterday
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-secondary rounded-lg p-2.5 border border-border">
            <Wallet className="w-3.5 h-3.5 text-primary mb-1" />
            <p className="text-sm font-bold text-foreground">K{todayRevenue.toLocaleString()}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Sales</p>
          </div>
          <div className="bg-secondary rounded-lg p-2.5 border border-border">
            <Hash className="w-3.5 h-3.5 text-primary mb-1" />
            <p className="text-sm font-bold text-foreground">{todayTxs.length}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Count</p>
          </div>
          <div className="bg-secondary rounded-lg p-2.5 border border-border">
            <TrendingUp className="w-3.5 h-3.5 text-success mb-1" />
            <p className="text-sm font-bold text-foreground">K{todayNet.toLocaleString()}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Net</p>
          </div>
        </div>
      </div>

      {/* Mini weekly chart */}
      <div className="bg-secondary rounded-lg border border-border p-3">
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold mb-2 flex items-center gap-1">
          <BarChart3 className="w-3 h-3" /> 7-Day Trend
        </p>
        <div className="flex items-end gap-1.5 h-16">
          {weekData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full relative" style={{ height: "48px" }}>
                <div
                  className={`absolute bottom-0 w-full rounded-t transition-all ${
                    d.label === format(new Date(), "EEE") ? "bg-primary" : "bg-primary/30"
                  }`}
                  style={{ height: `${Math.max((d.amount / maxWeek) * 100, 4)}%` }}
                />
              </div>
              <span className="text-[8px] text-muted-foreground">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Frequent Customers / Quick Repeat */}
      {frequentCustomers.length > 0 && onRepeatSale && (
        <div>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
            <Star className="w-3 h-3" /> Quick Repeat
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {frequentCustomers.map((c) => (
              <button
                key={c.phone}
                onClick={() => onRepeatSale(c.phone, c.lastAmount)}
                className="flex-shrink-0 bg-card border border-border rounded-lg px-3 py-2 hover:border-primary transition-colors active:scale-95"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${
                    c.provider === "MTN" ? "bg-mtn" : c.provider === "Zamtel" ? "bg-zamtel" : "bg-airtel"
                  }`}>
                    {c.provider[0]}
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-mono text-foreground">{c.phone}</p>
                    <p className="text-[8px] text-muted-foreground">{c.count}× · K{c.lastAmount}</p>
                  </div>
                  <Repeat className="w-3 h-3 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* All-Time Stats */}
      <div>
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
          <BarChart3 className="w-3 h-3" /> All Time
        </p>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-secondary rounded-lg p-2.5 border border-border">
            <Wallet className="w-3.5 h-3.5 text-primary mb-1" />
            <p className="text-sm font-bold text-foreground">K{allRevenue.toLocaleString()}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Sales</p>
          </div>
          <div className="bg-secondary rounded-lg p-2.5 border border-border">
            <Hash className="w-3.5 h-3.5 text-primary mb-1" />
            <p className="text-sm font-bold text-foreground">{successTxs.length}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Count</p>
          </div>
          <div className="bg-secondary rounded-lg p-2.5 border border-border">
            <TrendingUp className="w-3.5 h-3.5 text-success mb-1" />
            <p className="text-sm font-bold text-foreground">K{allNet.toLocaleString()}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Net</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-display font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2">
          Recent Transactions
        </h2>
        <div className="flex flex-col gap-1.5">
          {transactions.slice(0, 5).map((tx) => (
            <div
              key={tx.id}
              className="bg-secondary rounded-lg p-2.5 border border-border flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold text-foreground border ${
                    tx.provider === "MTN" ? "border-mtn text-mtn" : tx.provider === "Zamtel" ? "border-zamtel text-zamtel" : "border-airtel text-airtel"
                  }`}
                >
                  {tx.provider[0]}
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground font-mono">{tx.phone}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {new Date(tx.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-foreground">K{tx.amount.toLocaleString()}</p>
                <p className="text-[9px] text-muted-foreground">-K{tx.fee} fee</p>
                <p className={`text-[9px] font-medium ${
                  tx.status === "success" ? "text-success" :
                  tx.status === "pending" ? "text-primary animate-pulse" :
                  "text-destructive"
                }`}>
                  {tx.status === "pending" ? "⏳ PENDING" : tx.status.toUpperCase()}
                </p>
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-4 font-mono">
              — No transactions —
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
