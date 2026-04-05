import { useEffect, useState } from "react";
import { getSettings, upsertSetting, logAudit } from "@/lib/adminApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, ToggleLeft, QrCode, Target, Receipt, Bell, Wallet, RotateCcw, Printer, Star, Users, Moon, MessageSquare, BookUser } from "lucide-react";

const POS_FEATURES = [
  { key: "feature_qr_code", label: "QR Code Payments", desc: "Merchants can display scannable QR codes for customer payments", icon: QrCode },
  { key: "feature_sales_goal", label: "Daily Sales Goal", desc: "Merchants can set revenue targets with progress tracking", icon: Target },
  { key: "feature_expense_tracker", label: "Expense Tracker", desc: "Track business expenses and view profit/loss reports", icon: Receipt },
  { key: "feature_notifications", label: "Notification Center", desc: "Real-time alerts for payments, refunds, and announcements", icon: Bell },
  { key: "feature_withdrawals", label: "Withdrawals", desc: "Merchants can withdraw their balance to mobile money", icon: Wallet },
  { key: "feature_refunds", label: "Refund Requests", desc: "Allow merchants to request refunds on transactions", icon: RotateCcw },
  { key: "feature_receipt_print", label: "Receipt Printing", desc: "Print or share receipts for completed transactions", icon: Printer },
  { key: "feature_loyalty_points", label: "Loyalty Points", desc: "Customer rewards program with points per transaction", icon: Star },
  { key: "feature_staff_accounts", label: "Staff Accounts", desc: "Multiple cashier/operator logins per merchant", icon: Users },
  { key: "feature_dark_mode", label: "Dark Mode", desc: "Allow merchants to switch between light and dark themes", icon: Moon },
  { key: "feature_sms_receipt", label: "SMS Receipt", desc: "Send transaction receipt to customer via SMS after payment", icon: MessageSquare },
  { key: "feature_customer_directory", label: "Customer Directory", desc: "Save and manage frequent customers with contact details", icon: BookUser },
];

export default function AdminPOSFeatures() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings().then((data) => {
      const map: Record<string, string> = {};
      data.forEach((s) => (map[s.key] = s.value));
      setSettings(map);
      setLoading(false);
    });
  }, []);

  const isEnabled = (key: string) => settings[key] !== "false";

  const handleToggle = (key: string, checked: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: checked ? "true" : "false" }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const featureKeys = POS_FEATURES.map((f) => f.key);
      await Promise.all(
        featureKeys
          .filter((k) => settings[k] !== undefined)
          .map((k) => upsertSetting(k, settings[k]))
      );
      await logAudit("pos_features_updated", "app_settings", undefined, {
        features: featureKeys.reduce((acc, k) => ({ ...acc, [k]: isEnabled(k) }), {}),
      });
      toast.success("POS feature settings saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    }
    setSaving(false);
  };

  const enabledCount = POS_FEATURES.filter((f) => isEnabled(f.key)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <ToggleLeft className="h-6 w-6 text-primary" />
          POS Features
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enable or disable features available to merchants on the POS app.
        </p>
      </div>

      <div className="bg-muted rounded-lg p-3 text-sm">
        <span className="font-medium text-foreground">{enabledCount}</span>
        <span className="text-muted-foreground"> of {POS_FEATURES.length} features enabled</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature Toggles</CardTitle>
          <CardDescription>Turning off a feature hides it from all merchant POS screens</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {POS_FEATURES.map((feature) => (
            <div
              key={feature.key}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  isEnabled(feature.key) ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  <feature.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className={`text-sm font-medium ${isEnabled(feature.key) ? "text-foreground" : "text-muted-foreground"}`}>
                    {feature.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
              <Switch
                checked={isEnabled(feature.key)}
                onCheckedChange={(checked) => handleToggle(feature.key, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        <Save className="h-4 w-4 mr-2" />
        {saving ? "Saving..." : "Save Feature Settings"}
      </Button>
    </div>
  );
}
