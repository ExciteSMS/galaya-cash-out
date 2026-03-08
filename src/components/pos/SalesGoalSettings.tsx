import { useState } from "react";
import { ArrowLeft, Target, Save } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  onBack: () => void;
}

export default function SalesGoalSettings({ onBack }: Props) {
  const { merchant } = useAuth();
  const [goal, setGoal] = useState(String((merchant as any)?.daily_sales_goal || "0"));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!merchant) return;
    setSaving(true);
    const { error } = await supabase
      .from("merchants")
      .update({ daily_sales_goal: Number(goal) || 0 })
      .eq("id", merchant.id);
    if (error) {
      toast.error("Failed to save goal");
    } else {
      toast.success("Daily sales goal updated!");
    }
    setSaving(false);
  };

  const presets = [500, 1000, 2000, 5000, 10000];

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold text-lg text-foreground">Daily Sales Goal</h2>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-4">Set a daily revenue target to track your progress on the dashboard.</p>

      <div className="mb-4">
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Goal Amount (K)</label>
        <input
          type="number"
          value={goal}
          onChange={e => setGoal(e.target.value)}
          min="0"
          className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-lg font-bold focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {presets.map(p => (
          <button
            key={p}
            onClick={() => setGoal(String(p))}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              Number(goal) === p
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:border-primary"
            }`}
          >
            K{p.toLocaleString()}
          </button>
        ))}
      </div>

      {Number(goal) > 0 && (
        <div className="bg-secondary rounded-lg border border-border p-3 mb-4 text-center">
          <p className="text-xs text-muted-foreground">Your daily target</p>
          <p className="text-2xl font-bold text-primary">K{Number(goal).toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">A progress ring will show on your dashboard</p>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-display font-bold text-base disabled:opacity-40 transition-all flex items-center justify-center gap-2"
      >
        <Save className="w-4 h-4" />
        {saving ? "Saving..." : "Save Goal"}
      </button>
    </div>
  );
}
