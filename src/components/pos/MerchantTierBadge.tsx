import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/lib/api";
import { Crown } from "lucide-react";
import { subDays } from "date-fns";

interface Tier {
  id: string;
  name: string;
  min_monthly_volume: number;
  commission_rate: number;
  sort_order: number;
}

const tierColors: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  Bronze: { bg: "bg-orange-500/10", text: "text-orange-500", border: "border-orange-500/30", glow: "" },
  Silver: { bg: "bg-gray-300/10", text: "text-gray-400", border: "border-gray-400/30", glow: "" },
  Gold: { bg: "bg-yellow-500/10", text: "text-yellow-500", border: "border-yellow-500/30", glow: "shadow-yellow-500/10 shadow-md" },
};

export default function MerchantTierBadge({ transactions }: { transactions: Transaction[] }) {
  const [tiers, setTiers] = useState<Tier[]>([]);

  useEffect(() => {
    supabase.from("merchant_tiers").select("*").order("sort_order").then(({ data }) => {
      if (data) setTiers(data as Tier[]);
    });
  }, []);

  const monthlyVolume = useMemo(() => {
    const cutoff = subDays(new Date(), 30);
    return transactions
      .filter(t => t.status === "success" && new Date(t.created_at) >= cutoff)
      .reduce((s, t) => s + t.amount, 0);
  }, [transactions]);

  const currentTier = useMemo(() => {
    const sorted = [...tiers].sort((a, b) => b.min_monthly_volume - a.min_monthly_volume);
    return sorted.find(t => monthlyVolume >= t.min_monthly_volume);
  }, [tiers, monthlyVolume]);

  const nextTier = useMemo(() => {
    return tiers
      .filter(t => t.min_monthly_volume > monthlyVolume)
      .sort((a, b) => a.min_monthly_volume - b.min_monthly_volume)[0];
  }, [tiers, monthlyVolume]);

  if (!currentTier || tiers.length === 0) return null;

  const colors = tierColors[currentTier.name] || tierColors.Bronze;
  const progressToNext = nextTier
    ? Math.min(((monthlyVolume - currentTier.min_monthly_volume) / (nextTier.min_monthly_volume - currentTier.min_monthly_volume)) * 100, 100)
    : 100;

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} ${colors.glow} p-3`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Crown className={`w-4 h-4 ${colors.text}`} />
          <span className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}>{currentTier.name}</span>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">{currentTier.commission_rate}% fee</span>
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
        <span>K{monthlyVolume.toLocaleString()} /mo</span>
        {nextTier && <span>{nextTier.name} at K{nextTier.min_monthly_volume.toLocaleString()}</span>}
      </div>
      {nextTier && (
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${colors.text.replace("text-", "bg-")}`}
            style={{ width: `${progressToNext}%` }}
          />
        </div>
      )}
      {!nextTier && (
        <p className="text-[9px] text-muted-foreground">🏆 Highest tier reached</p>
      )}
    </div>
  );
}
