import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Plus, Trash2, Receipt, TrendingUp, TrendingDown } from "lucide-react";
import { Transaction } from "@/lib/api";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  expense_date: string;
  created_at: string;
}

const CATEGORIES = [
  { key: "stock", label: "Stock/Inventory", emoji: "📦" },
  { key: "rent", label: "Rent", emoji: "🏠" },
  { key: "utilities", label: "Utilities", emoji: "💡" },
  { key: "transport", label: "Transport", emoji: "🚗" },
  { key: "salary", label: "Salaries", emoji: "👤" },
  { key: "other", label: "Other", emoji: "📋" },
];

interface ExpenseTrackerProps {
  onBack: () => void;
  transactions: Transaction[];
}

export default function ExpenseTracker({ onBack, transactions }: ExpenseTrackerProps) {
  const { merchant } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!merchant) return;
    supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false })
      .then(({ data }) => {
        if (data) setExpenses(data as Expense[]);
        setLoading(false);
      });
  }, [merchant]);

  const monthlyStats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const monthExpenses = expenses
      .filter(e => new Date(e.expense_date) >= monthStart && new Date(e.expense_date) <= monthEnd)
      .reduce((s, e) => s + Number(e.amount), 0);

    const monthRevenue = transactions
      .filter(t => t.status === "success" && new Date(t.created_at) >= monthStart && new Date(t.created_at) <= monthEnd)
      .reduce((s, t) => s + t.amount, 0);

    const monthFees = transactions
      .filter(t => t.status === "success" && new Date(t.created_at) >= monthStart && new Date(t.created_at) <= monthEnd)
      .reduce((s, t) => s + t.fee, 0);

    const netIncome = monthRevenue - monthFees;
    const profit = netIncome - monthExpenses;

    return { monthExpenses, monthRevenue, netIncome, profit };
  }, [expenses, transactions]);

  const categoryTotals = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const map: Record<string, number> = {};
    expenses
      .filter(e => new Date(e.expense_date) >= monthStart)
      .forEach(e => { map[e.category] = (map[e.category] || 0) + Number(e.amount); });
    return map;
  }, [expenses]);

  const handleAdd = async () => {
    if (!amount || Number(amount) <= 0) { toast.error("Enter a valid amount"); return; }
    if (!merchant) return;
    setSaving(true);
    const { error } = await supabase.from("expenses").insert({
      merchant_id: merchant.id,
      amount: Number(amount),
      category,
      description: description.trim(),
    });
    if (error) {
      toast.error("Failed to add expense");
    } else {
      toast.success("Expense added");
      setAmount(""); setDescription(""); setCategory("other"); setShowAdd(false);
      // Refresh
      const { data } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false });
      if (data) setExpenses(data as Expense[]);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("expenses").delete().eq("id", id);
    setExpenses(prev => prev.filter(e => e.id !== id));
    toast.success("Expense deleted");
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold text-lg text-foreground">Expenses</h2>
          </div>
          <button onClick={() => setShowAdd(!showAdd)} className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Monthly P&L Summary */}
      <div className="bg-secondary rounded-lg border border-border p-3 mb-3">
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">
          {format(new Date(), "MMMM yyyy")} Summary
        </p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="bg-card rounded-lg p-2 text-center">
            <TrendingUp className="w-3 h-3 text-success mx-auto mb-0.5" />
            <p className="text-xs font-bold text-foreground">K{monthlyStats.netIncome.toLocaleString()}</p>
            <p className="text-[8px] text-muted-foreground">Net Income</p>
          </div>
          <div className="bg-card rounded-lg p-2 text-center">
            <TrendingDown className="w-3 h-3 text-destructive mx-auto mb-0.5" />
            <p className="text-xs font-bold text-foreground">K{monthlyStats.monthExpenses.toLocaleString()}</p>
            <p className="text-[8px] text-muted-foreground">Expenses</p>
          </div>
        </div>
        <div className={`text-center p-2 rounded-lg ${monthlyStats.profit >= 0 ? "bg-success/10" : "bg-destructive/10"}`}>
          <p className={`text-sm font-bold ${monthlyStats.profit >= 0 ? "text-success" : "text-destructive"}`}>
            {monthlyStats.profit >= 0 ? "+" : ""}K{monthlyStats.profit.toLocaleString()}
          </p>
          <p className="text-[8px] text-muted-foreground">Profit / Loss</p>
        </div>
      </div>

      {/* Category breakdown */}
      {Object.keys(categoryTotals).length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
          {CATEGORIES.filter(c => categoryTotals[c.key]).map(c => (
            <div key={c.key} className="flex-shrink-0 bg-card border border-border rounded-lg px-2.5 py-1.5 text-center">
              <span className="text-xs">{c.emoji}</span>
              <p className="text-[10px] font-bold text-foreground">K{categoryTotals[c.key]?.toLocaleString()}</p>
              <p className="text-[8px] text-muted-foreground">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add expense form */}
      {showAdd && (
        <div className="bg-card border border-border rounded-xl p-3 mb-3 space-y-2">
          <input
            type="number"
            placeholder="Amount (K)"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground"
          />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground"
          >
            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
          </select>
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground"
          />
          <button
            onClick={handleAdd}
            disabled={saving}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-40"
          >
            {saving ? "Adding..." : "Add Expense"}
          </button>
        </div>
      )}

      {/* Expense list */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pb-20">
        {expenses.slice(0, 20).map(e => {
          const cat = CATEGORIES.find(c => c.key === e.category);
          return (
            <div key={e.id} className="bg-card border border-border rounded-lg p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-sm">{cat?.emoji || "📋"}</span>
                <div>
                  <p className="text-xs font-medium text-foreground">{cat?.label || e.category}</p>
                  {e.description && <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{e.description}</p>}
                  <p className="text-[9px] text-muted-foreground">{format(new Date(e.expense_date), "dd MMM yyyy")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">K{Number(e.amount).toLocaleString()}</span>
                <button onClick={() => handleDelete(e.id)} className="p-1 rounded hover:bg-destructive/10">
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
              </div>
            </div>
          );
        })}
        {expenses.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-8">No expenses logged yet</p>
        )}
      </div>
    </div>
  );
}
