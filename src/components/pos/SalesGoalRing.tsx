import { useMemo } from "react";
import { Transaction } from "@/lib/api";
import { Target } from "lucide-react";

interface SalesGoalRingProps {
  transactions: Transaction[];
  goal: number;
}

export default function SalesGoalRing({ transactions, goal }: SalesGoalRingProps) {
  const todayRevenue = useMemo(() => {
    const today = new Date().toDateString();
    return transactions
      .filter(t => t.status === "success" && new Date(t.created_at).toDateString() === today)
      .reduce((s, t) => s + t.amount, 0);
  }, [transactions]);

  if (!goal || goal <= 0) return null;

  const pct = Math.min((todayRevenue / goal) * 100, 100);
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const hit = pct >= 100;

  return (
    <div className="bg-secondary rounded-lg border border-border p-3 flex items-center gap-3">
      <div className="relative w-16 h-16 flex-shrink-0">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="5" />
          <circle
            cx="36" cy="36" r={radius} fill="none"
            stroke={hit ? "hsl(var(--success))" : "hsl(var(--primary))"}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {hit ? (
            <span className="text-[10px] font-bold text-success">🎯</span>
          ) : (
            <span className="text-[10px] font-bold text-primary">{Math.round(pct)}%</span>
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-0.5">
          <Target className="w-3 h-3 text-primary" />
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Daily Goal</p>
        </div>
        <p className="text-sm font-bold text-foreground">
          K{todayRevenue.toLocaleString()} <span className="text-muted-foreground font-normal text-xs">/ K{goal.toLocaleString()}</span>
        </p>
        {hit ? (
          <p className="text-[10px] text-success font-medium">🎉 Goal reached!</p>
        ) : (
          <p className="text-[10px] text-muted-foreground">K{(goal - todayRevenue).toLocaleString()} remaining</p>
        )}
      </div>
    </div>
  );
}
