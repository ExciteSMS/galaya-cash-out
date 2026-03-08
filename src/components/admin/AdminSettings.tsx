import { useEffect, useState } from "react";
import { getSettings, upsertSetting, logAudit } from "@/lib/adminApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Eye, EyeOff, MessageSquare, Save, Zap } from "lucide-react";

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
      const gatewayAndSmsKeys = Object.keys(settings).filter(
        (k) => k.startsWith("gateway_") || k.startsWith("moneyunify_") || k.startsWith("lipila_") || k.startsWith("sms_") || k.startsWith("excite_")
      );
      await Promise.all(gatewayAndSmsKeys.map((key) => upsertSetting(key, settings[key])));
      await logAudit("settings_updated", "app_settings", undefined, { keys: gatewayAndSmsKeys });
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
                  <button type="button" onClick={() => setShowMoneyUnifyKey(!showMoneyUnifyKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
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
                    <button type="button" onClick={() => setShowLipilaKey(!showLipilaKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
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

      {/* SMS Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            SMS Notifications (Excite SMS)
          </CardTitle>
          <CardDescription>Send payment confirmations to merchants and customers via SMS</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground text-sm">Enable SMS Notifications</h3>
              <p className="text-xs text-muted-foreground">Send SMS on successful payments</p>
            </div>
            <Switch
              checked={settings.sms_enabled === "true"}
              onCheckedChange={(checked) => handleToggle("sms_enabled", checked)}
            />
          </div>

          {settings.sms_enabled === "true" && (
            <div className="space-y-4 pt-2">
              <div>
                <Label htmlFor="sms-key">Excite SMS API Key</Label>
                <div className="relative mt-1">
                  <Input
                    id="sms-key"
                    type={showSmsKey ? "text" : "password"}
                    value={settings.excite_sms_api_key || ""}
                    onChange={(e) => handleChange("excite_sms_api_key", e.target.value)}
                    placeholder="1|KpE6dAGE94RT..."
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowSmsKey(!showSmsKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showSmsKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Get this from gateway.excitesms.com</p>
              </div>
              <div>
                <Label htmlFor="sms-sender">Sender ID</Label>
                <Input
                  id="sms-sender"
                  value={settings.excite_sms_sender_id || ""}
                  onChange={(e) => handleChange("excite_sms_sender_id", e.target.value)}
                  placeholder="Galaya"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Name that appears as the SMS sender (max 11 chars)</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Notify Merchant</p>
                  <p className="text-xs text-muted-foreground">SMS to merchant on each sale</p>
                </div>
                <Switch
                  checked={settings.sms_notify_merchant !== "false"}
                  onCheckedChange={(checked) => handleToggle("sms_notify_merchant", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Notify Customer</p>
                  <p className="text-xs text-muted-foreground">SMS receipt to paying customer</p>
                </div>
                <Switch
                  checked={settings.sms_notify_customer !== "false"}
                  onCheckedChange={(checked) => handleToggle("sms_notify_customer", checked)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        <Save className="h-4 w-4 mr-2" />
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}
