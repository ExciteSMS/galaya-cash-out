import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAllMerchants, getAllTransactions, logAudit } from "@/lib/adminApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, subDays } from "date-fns";
import { Crown, Save, Users } from "lucide-react";
import { toast } from "sonner";

interface Tier {
  id: string;
  name: string;
  min_monthly_volume: number;
  commission_rate: number;
  sort_order: number;
}

export default function AdminTiers() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("merchant_tiers").select("*").order("sort_order"),
      getAllMerchants(),
      getAllTransactions(),
    ]).then(([tiersRes, m, t]) => {
      if (tiersRes.data) setTiers(tiersRes.data as Tier[]);
      setMerchants(m);
      setTxs(t);
      setLoading(false);
    });
  }, []);

  const getMerchantVolume = (merchantId: string) => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    return txs
      .filter(t => t.merchant_id === merchantId && t.status === "success" && new Date(t.created_at) >= thirtyDaysAgo)
      .reduce((s: number, t: any) => s + t.amount, 0);
  };

  const getMerchantTier = (volume: number): Tier | undefined => {
    const sorted = [...tiers].sort((a, b) => b.min_monthly_volume - a.min_monthly_volume);
    return sorted.find(t => volume >= t.min_monthly_volume);
  };

  const handleTierChange = (id: string, field: keyof Tier, value: string) => {
    setTiers(prev => prev.map(t => t.id === id ? { ...t, [field]: field === "name" ? value : Number(value) } : t));
  };

  const saveTiers = async () => {
    setSaving(true);
    try {
      for (const tier of tiers) {
        await supabase.from("merchant_tiers").update({
          name: tier.name,
          min_monthly_volume: tier.min_monthly_volume,
          commission_rate: tier.commission_rate,
        }).eq("id", tier.id);
      }
      await logAudit("tiers_updated", "merchant_tiers", undefined, { tiers: tiers.map(t => t.name) });
      toast.success("Tiers saved");
    } catch {
      toast.error("Failed to save tiers");
    }
    setSaving(false);
  };

  const tierColors: Record<string, string> = {
    Bronze: "text-orange-500",
    Silver: "text-gray-400",
    Gold: "text-yellow-500",
  };

  const merchantsByTier = tiers.map(tier => {
    const count = merchants.filter(m => {
      const vol = getMerchantVolume(m.id);
      const mTier = getMerchantTier(vol);
      return mTier?.id === tier.id;
    }).length;
    return { ...tier, merchantCount: count };
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Crown className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold font-display">Merchant Tiers</h1>
      </div>

      {/* Tier Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tier Configuration</CardTitle>
          <CardDescription>Set volume thresholds and commission rates for each tier</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tiers.map((tier) => (
            <div key={tier.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Crown className={`h-4 w-4 ${tierColors[tier.name] || "text-primary"}`} />
                <span className="font-bold">{tier.name}</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Tier Name</Label>
                  <Input value={tier.name} onChange={e => handleTierChange(tier.id, "name", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Min Monthly Volume (K)</Label>
                  <Input type="number" value={tier.min_monthly_volume} onChange={e => handleTierChange(tier.id, "min_monthly_volume", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Commission Rate (%)</Label>
                  <Input type="number" step="0.1" value={tier.commission_rate} onChange={e => handleTierChange(tier.id, "commission_rate", e.target.value)} className="mt-1" />
                </div>
              </div>
            </div>
          ))}
          <Button onClick={saveTiers} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save Tiers"}
          </Button>
        </CardContent>
      </Card>

      {/* Merchant Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Merchant Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {merchantsByTier.map((tier) => (
              <div key={tier.id} className="text-center border rounded-lg p-4">
                <Crown className={`h-6 w-6 mx-auto mb-2 ${tierColors[tier.name] || "text-primary"}`} />
                <p className="font-bold text-lg">{tier.merchantCount}</p>
                <p className="text-xs text-muted-foreground">{tier.name} Merchants</p>
                <p className="text-[10px] text-muted-foreground mt-1">≥K{tier.min_monthly_volume.toLocaleString()}/mo · {tier.commission_rate}% fee</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Merchant List with Tiers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">All Merchants & Their Tiers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-muted-foreground font-medium">Merchant</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">30-Day Volume</th>
                  <th className="text-center p-3 text-muted-foreground font-medium">Tier</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Commission</th>
                </tr>
              </thead>
              <tbody>
                {merchants.map((m) => {
                  const vol = getMerchantVolume(m.id);
                  const tier = getMerchantTier(vol);
                  const nextTier = tiers.find(t => t.min_monthly_volume > vol);
                  return (
                    <tr key={m.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3">
                        <p className="font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.phone_number}</p>
                      </td>
                      <td className="p-3 text-right font-mono">K{vol.toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Crown className={`h-3 w-3 ${tierColors[tier?.name || ""] || "text-muted-foreground"}`} />
                          <Badge variant="outline">{tier?.name || "None"}</Badge>
                        </div>
                        {nextTier && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            K{(nextTier.min_monthly_volume - vol).toLocaleString()} to {nextTier.name}
                          </p>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono">{tier?.commission_rate || 0}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
