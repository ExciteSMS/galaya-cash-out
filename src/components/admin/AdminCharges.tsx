import { useEffect, useState } from "react";
import { getSettings, upsertSetting, logAudit } from "@/lib/adminApi";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Crown, DollarSign, Save, Percent, ArrowDownToLine } from "lucide-react";
import { toast } from "sonner";

const FEE_KEYS = [
  { key: "fee_tier_50", label: "Up to K50", range: "K1 – K50" },
  { key: "fee_tier_200", label: "K51 – K200", range: "K51 – K200" },
  { key: "fee_tier_500", label: "K201 – K500", range: "K201 – K500" },
  { key: "fee_tier_1000", label: "K501 – K1,000", range: "K501 – K1,000" },
  { key: "fee_tier_above", label: "Above K1,000", range: "K1,001+" },
];

interface Tier {
  id: string;
  name: string;
  min_monthly_volume: number;
  commission_rate: number;
  sort_order: number;
}

const tierColors: Record<string, string> = {
  Bronze: "text-orange-500",
  Silver: "text-gray-400",
  Gold: "text-yellow-500",
};

export default function AdminCharges() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingFees, setSavingFees] = useState(false);
  const [savingTiers, setSavingTiers] = useState(false);

  useEffect(() => {
    Promise.all([
      getSettings(),
      supabase.from("merchant_tiers").select("*").order("sort_order"),
    ]).then(([settingsData, tiersRes]) => {
      const map: Record<string, string> = {};
      settingsData.forEach((s) => (map[s.key] = s.value));
      setSettings(map);
      if (tiersRes.data) setTiers(tiersRes.data as Tier[]);
      setLoading(false);
    });
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleTierChange = (id: string, field: keyof Tier, value: string) => {
    setTiers((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, [field]: field === "name" ? value : Number(value) } : t
      )
    );
  };

  const saveFees = async () => {
    setSavingFees(true);
    try {
      const feeKeys = [
        ...FEE_KEYS.map((f) => f.key),
        "withdrawal_platform_fee_pct",
        "withdrawal_gateway_fee_pct",
      ];
      await Promise.all(
        feeKeys
          .filter((k) => settings[k] !== undefined)
          .map((k) => upsertSetting(k, settings[k]))
      );
      await logAudit("fees_updated", "app_settings", undefined, { keys: feeKeys });
      toast.success("Fee settings saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save fees");
    }
    setSavingFees(false);
  };

  const saveTiers = async () => {
    setSavingTiers(true);
    try {
      for (const tier of tiers) {
        await supabase
          .from("merchant_tiers")
          .update({
            name: tier.name,
            min_monthly_volume: tier.min_monthly_volume,
            commission_rate: tier.commission_rate,
          })
          .eq("id", tier.id);
      }
      await logAudit("tiers_updated", "merchant_tiers", undefined, {
        tiers: tiers.map((t) => t.name),
      });
      toast.success("Tiers saved");
    } catch {
      toast.error("Failed to save tiers");
    }
    setSavingTiers(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalWithdrawalFee =
    parseFloat(settings.withdrawal_platform_fee_pct || "1") +
    parseFloat(settings.withdrawal_gateway_fee_pct || "3.5");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-primary" />
          Charges & Fees
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          All platform fees, transaction charges, and merchant tier commissions in one place.
        </p>
      </div>

      {/* Transaction Fees */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Percent className="h-4 w-4 text-primary" />
            Transaction Fees
          </CardTitle>
          <CardDescription>
            Flat fee charged per transaction based on amount tier (in ZMW)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEE_KEYS.map((tier) => (
              <div key={tier.key} className="border rounded-lg p-3">
                <Label htmlFor={tier.key} className="text-xs text-muted-foreground">
                  {tier.range}
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-medium text-muted-foreground">K</span>
                  <Input
                    id={tier.key}
                    type="number"
                    min="0"
                    step="0.5"
                    value={settings[tier.key] || "0"}
                    onChange={(e) => handleChange(tier.key, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal Fees */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowDownToLine className="h-4 w-4 text-primary" />
            Withdrawal Fees
          </CardTitle>
          <CardDescription>
            Percentage charged when merchants withdraw their balance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="withdrawal_platform_fee_pct">Platform Fee (%)</Label>
              <Input
                id="withdrawal_platform_fee_pct"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={settings.withdrawal_platform_fee_pct || "1"}
                onChange={(e) => handleChange("withdrawal_platform_fee_pct", e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Your platform revenue per withdrawal</p>
            </div>
            <div>
              <Label htmlFor="withdrawal_gateway_fee_pct">Gateway Fee (%)</Label>
              <Input
                id="withdrawal_gateway_fee_pct"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={settings.withdrawal_gateway_fee_pct || "3.5"}
                onChange={(e) => handleChange("withdrawal_gateway_fee_pct", e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Gateway settlement fee</p>
            </div>
          </div>
          <div className="bg-muted rounded-lg p-3 text-sm">
            <p className="font-medium text-foreground">
              Total merchant withdrawal cost: {totalWithdrawalFee.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Platform keeps {settings.withdrawal_platform_fee_pct || "1"}% · Gateway takes{" "}
              {settings.withdrawal_gateway_fee_pct || "3.5"}%
            </p>
          </div>
          <Button onClick={saveFees} disabled={savingFees} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            {savingFees ? "Saving..." : "Save All Fees"}
          </Button>
        </CardContent>
      </Card>

      {/* Merchant Tier Commissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="h-4 w-4 text-primary" />
            Merchant Tier Commissions
          </CardTitle>
          <CardDescription>
            Volume-based tiers — merchants auto-upgrade as their monthly sales grow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tiers.map((tier) => (
            <div key={tier.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Crown className={`h-4 w-4 ${tierColors[tier.name] || "text-primary"}`} />
                <Badge variant="outline">{tier.name}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Tier Name</Label>
                  <Input
                    value={tier.name}
                    onChange={(e) => handleTierChange(tier.id, "name", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Min Monthly Volume (K)</Label>
                  <Input
                    type="number"
                    value={tier.min_monthly_volume}
                    onChange={(e) =>
                      handleTierChange(tier.id, "min_monthly_volume", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Commission Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={tier.commission_rate}
                    onChange={(e) =>
                      handleTierChange(tier.id, "commission_rate", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          ))}
          <Button onClick={saveTiers} disabled={savingTiers} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            {savingTiers ? "Saving..." : "Save Tiers"}
          </Button>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <h3 className="font-display font-bold text-sm text-primary mb-3">Fee Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Transaction Fees</p>
              <p className="font-medium text-foreground">
                K{settings.fee_tier_50 || "0"} – K{settings.fee_tier_above || "0"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Withdrawal Fee</p>
              <p className="font-medium text-foreground">{totalWithdrawalFee.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Commission Tiers</p>
              <p className="font-medium text-foreground">
                {tiers.map((t) => `${t.commission_rate}%`).join(" / ")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
