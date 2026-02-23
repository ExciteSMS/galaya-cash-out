import { ArrowUpRight, TrendingUp, Wallet, Hash } from "lucide-react";
import { Transaction } from "@/lib/mockApi";

interface DashboardProps {
  transactions: Transaction[];
  onNewSale: () => void;
}

const Dashboard = ({ transactions, onNewSale }: DashboardProps) => {
  const today = new Date();
  const todayTxs = transactions.filter(
    (t) => t.timestamp.toDateString() === today.toDateString() && t.status === "success"
  );
  const todayRevenue = todayTxs.reduce((sum, t) => sum + t.amount, 0);
  const todayFees = todayTxs.reduce((sum, t) => sum + t.fee, 0);

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">Galaya POS</h1>
          <p className="text-xs text-muted-foreground">
            {today.toLocaleDateString("en-ZM", { weekday: "long", month: "short", day: "numeric" })}
          </p>
        </div>
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
          G
        </div>
      </div>

      {/* Quick Sale Button */}
      <button
        onClick={onNewSale}
        className="w-full bg-primary text-primary-foreground rounded-2xl p-5 flex items-center justify-between shadow-lg hover:brightness-105 active:scale-[0.98] transition-all"
      >
        <div className="text-left">
          <p className="font-display font-bold text-lg">New Sale</p>
          <p className="text-primary-foreground/70 text-sm">Accept mobile money payment</p>
        </div>
        <ArrowUpRight className="w-8 h-8" />
      </button>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl p-3 border border-border">
          <Wallet className="w-4 h-4 text-primary mb-1" />
          <p className="text-lg font-bold text-foreground">K{todayRevenue.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Today's Sales</p>
        </div>
        <div className="bg-card rounded-xl p-3 border border-border">
          <Hash className="w-4 h-4 text-primary mb-1" />
          <p className="text-lg font-bold text-foreground">{todayTxs.length}</p>
          <p className="text-[10px] text-muted-foreground">Transactions</p>
        </div>
        <div className="bg-card rounded-xl p-3 border border-border">
          <TrendingUp className="w-4 h-4 text-success mb-1" />
          <p className="text-lg font-bold text-foreground">K{todayFees.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Fees Earned</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <h2 className="font-display font-semibold text-sm text-foreground mb-2">Recent</h2>
        <div className="flex flex-col gap-2">
          {transactions.slice(0, 5).map((tx) => (
            <div
              key={tx.id}
              className="bg-card rounded-xl p-3 border border-border flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    tx.provider === "MTN"
                      ? "bg-mtn"
                      : tx.provider === "Zamtel"
                      ? "bg-zamtel"
                      : "bg-airtel"
                  }`}
                >
                  {tx.provider[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{tx.phone}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {tx.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">K{tx.amount.toLocaleString()}</p>
                <p
                  className={`text-[10px] font-medium ${
                    tx.status === "success" ? "text-success" : "text-destructive"
                  }`}
                >
                  {tx.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
