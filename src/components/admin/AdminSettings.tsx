import { useEffect, useState } from "react";
import { getSettings, updateSetting } from "@/lib/adminApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Save } from "lucide-react";

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
  const [showKey, setShowKey] = useState(false);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises = Object.entries(settings).map(([key, value]) =>
        updateSetting(key, value)
      );
      await Promise.all(promises);
      toast.success("Settings saved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-display">Settings</h1>

      {/* API Key */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Gateway</CardTitle>
          <CardDescription>MoneyUnify API credentials for mobile money processing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="api-key">MoneyUnify Auth ID</Label>
            <div className="flex gap-2 mt-1">
              <div className="relative flex-1">
                <Input
                  id="api-key"
                  type={showKey ? "text" : "password"}
                  value={settings.moneyunify_auth_id || ""}
                  onChange={(e) => handleChange("moneyunify_auth_id", e.target.value)}
                  placeholder="Enter your MoneyUnify auth_id"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Get this from your MoneyUnify dashboard at moneyunify.one
            </p>
          </div>
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

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        <Save className="h-4 w-4 mr-2" />
        {saving ? "Saving..." : "Save All Settings"}
      </Button>
    </div>
  );
}
