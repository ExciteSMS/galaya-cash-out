import { useEffect, useState } from "react";
import { getSettings, updateSetting, upsertSetting, logAudit } from "@/lib/adminApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Eye, EyeOff, MessageSquare, Save, Zap } from "lucide-react";

const FEE_KEYS = [
  { key: "fee_tier_50", label: "Up to K50" },
  { key: "fee_tier_200", label: "K51 – K200" },
  { key: "fee_tier_500", label: "K201 – K500" },
  { key: "fee_tier_1000", label: "K501 – K1,000" },
  { key: "fee_tier_above", label: "Above K1,000" },
];

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMoneyUnifyKey, setShowMoneyUnifyKey] = useState(false);
  const [showLipilaKey, setShowLipilaKey] = useState(false);
  const [showSmsKey, setShowSmsKey] = useState(false);

  useEffect(() => {
    getSettings().then((data) => {
      const map: Record<string, string> = {};
      data.forEach((s) => (map[s.key] = s.value));
      setSettings(map);
      setLoading(false);
    });
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggle = (key: string, checked: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: checked ? "true" : "false" }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises = Object.entries(settings).map(([key, value]) =>
        upsertSetting(key, value)
      );
      await Promise.all(promises);
      await logAudit("settings_updated", "app_settings", undefined, { keys: Object.keys(settings) });
      toast.success("Settings saved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const callbackUrl = `${window.location.origin.replace('lovable.app', 'supabase.co')}/functions/v1/lipila-callback`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-display">Settings</h1>

      {/* Payment Gateways */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Payment Gateways
          </CardTitle>
          <CardDescription>Enable/disable payment methods and configure API credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* MoneyUnify */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">MoneyUnify</h3>
                <p className="text-xs text-muted-foreground">MTN, Airtel, Zamtel via MoneyUnify</p>
              </div>
              <Switch
                checked={settings.gateway_moneyunify_enabled !== "false"}
                onCheckedChange={(checked) => handleToggle("gateway_moneyunify_enabled", checked)}
              />
            </div>
            {settings.gateway_moneyunify_enabled !== "false" && (
              <div>
                <Label htmlFor="mu-key">Auth ID</Label>
                <div className="relative mt-1">
                  <Input
                    id="mu-key"
                    type={showMoneyUnifyKey ? "text" : "password"}
                    value={settings.moneyunify_auth_id || ""}
                    onChange={(e) => handleChange("moneyunify_auth_id", e.target.value)}
                    placeholder="Enter your MoneyUnify auth_id"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMoneyUnifyKey(!showMoneyUnifyKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showMoneyUnifyKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Get this from moneyunify.one</p>
              </div>
            )}
          </div>

          {/* Lipila */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Lipila</h3>
                <p className="text-xs text-muted-foreground">MoMo Collections via Lipila</p>
              </div>
              <Switch
                checked={settings.gateway_lipila_enabled === "true"}
                onCheckedChange={(checked) => handleToggle("gateway_lipila_enabled", checked)}
              />
            </div>
            {settings.gateway_lipila_enabled === "true" && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="lipila-key">API Key</Label>
                  <div className="relative mt-1">
                    <Input
                      id="lipila-key"
                      type={showLipilaKey ? "text" : "password"}
                      value={settings.lipila_api_key || ""}
                      onChange={(e) => handleChange("lipila_api_key", e.target.value)}
                      placeholder="Enter your Lipila API key"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLipilaKey(!showLipilaKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showLipilaKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Get this from your Lipila dashboard at lipila.dev</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-xs space-y-1">
                  <p className="font-medium text-foreground">Callback URL (add to Lipila dashboard):</p>
                  <code className="block bg-background p-2 rounded text-[10px] break-all select-all">{callbackUrl}</code>
                </div>
              </div>
            )}
          </div>

          {settings.gateway_lipila_enabled === "true" && settings.gateway_moneyunify_enabled !== "false" && (
            <div className="bg-accent/50 rounded-lg p-3 text-xs text-accent-foreground">
              <p className="font-medium">⚡ Both gateways enabled — Lipila will be used as the primary gateway.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fee Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Configuration</CardTitle>
          <CardDescription>Set transaction fees per amount tier (in ZMW)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEE_KEYS.map((tier) => (
              <div key={tier.key}>
                <Label htmlFor={tier.key}>{tier.label}</Label>
                <Input
                  id={tier.key}
                  type="number"
                  min="0"
                  step="0.5"
                  value={settings[tier.key] || "0"}
                  onChange={(e) => handleChange(tier.key, e.target.value)}
                  className="mt-1"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal Fees */}
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Fees</CardTitle>
          <CardDescription>Platform fee charged to merchants on withdrawals</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <p className="text-xs text-muted-foreground mt-1">Your platform revenue per withdrawal (default 1%)</p>
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
            <p className="text-xs text-muted-foreground mt-1">Gateway settlement fee (default 3.5%)</p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-sm">
            <p className="font-medium text-foreground">Total merchant withdrawal cost: {
              (parseFloat(settings.withdrawal_platform_fee_pct || "1") + parseFloat(settings.withdrawal_gateway_fee_pct || "3.5")).toFixed(1)
            }%</p>
            <p className="text-xs text-muted-foreground mt-1">Platform keeps {settings.withdrawal_platform_fee_pct || "1"}% · Gateway takes {settings.withdrawal_gateway_fee_pct || "3.5"}%</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        <Save className="h-4 w-4 mr-2" />
        {saving ? "Saving..." : "Save All Settings"}
      </Button>
    </div>
  );
}
