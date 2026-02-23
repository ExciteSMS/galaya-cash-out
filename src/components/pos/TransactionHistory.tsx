import { Transaction } from "@/lib/mockApi";
import { Search } from "lucide-react";
import { useState } from "react";

interface TransactionHistoryProps {
  transactions: Transaction[];
}

const TransactionHistory = ({ transactions }: TransactionHistoryProps) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "success" | "failed">("all");

  const filtered = transactions.filter((tx) => {
    if (filter !== "all" && tx.status !== filter) return false;
    if (search && !tx.phone.includes(search) && !tx.reference.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalSuccess = transactions.filter((t) => t.status === "success").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="flex flex-col h-full p-4">
      <h2 className="font-display font-bold text-lg text-foreground mb-1">Transaction History</h2>
      <p className="text-xs text-muted-foreground mb-4">
        {transactions.length} transactions · K{totalSuccess.toLocaleString()} total
      </p>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by phone or reference..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {(["all", "success", "failed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2 pb-20">
        {filtered.map((tx) => (
          <div
            key={tx.id}
            className="bg-card rounded-xl p-3 border border-border flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                  tx.provider === "MTN" ? "bg-mtn" : tx.provider === "Zamtel" ? "bg-zamtel" : "bg-airtel"
                }`}
              >
                {tx.provider[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{tx.phone}</p>
                <p className="text-[10px] text-muted-foreground">
                  {tx.timestamp.toLocaleDateString()} · {tx.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">{tx.reference}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">K{tx.amount.toLocaleString()}</p>
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  tx.status === "success"
                    ? "bg-success/10 text-success"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {tx.status}
              </span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No transactions found</p>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
