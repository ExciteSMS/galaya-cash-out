import { ArrowUpRight, TrendingUp, Wallet, Hash } from "lucide-react";
import { Transaction } from "@/lib/api";

interface DashboardProps {
  transactions: Transaction[];
  onNewSale: () => void;
}

const Dashboard = ({ transactions, onNewSale }: DashboardProps) => {
  const today = new Date().toDateString();
  const todayTxs = transactions.filter(
    (t) => new Date(t.created_at).toDateString() === today && t.status === "success"
  );
  const todayRevenue = todayTxs.reduce((sum, t) => sum + t.amount, 0);
  const todayFees = todayTxs.reduce((sum, t) => sum + t.fee, 0);
  const todayNet = todayRevenue - todayFees;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold font-display text-primary text-glow">GALAYA POS</h1>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
            {new Date().toLocaleDateString("en-ZM", { weekday: "short", month: "short", day: "numeric" })}
          </p>
        </div>
        <div className="w-8 h-8 rounded border border-primary flex items-center justify-center text-primary font-bold text-sm text-glow">
          G
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
                <p className={`text-[9px] font-medium ${tx.status === "success" ? "text-success" : "text-destructive"}`}>
                  {tx.status.toUpperCase()}
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
