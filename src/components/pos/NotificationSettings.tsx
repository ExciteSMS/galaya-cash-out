import { useState } from "react";
import { ArrowLeft, Bell, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface NotificationSettingsProps {
  onBack: () => void;
}

const NotificationSettings = ({ onBack }: NotificationSettingsProps) => {
  const { merchant } = useAuth();
  const [txAlerts, setTxAlerts] = useState(true);
  const [dailySummary, setDailySummary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!merchant) return;
    setSaving(true);
    await supabase
      .from("merchants")
      .update({
        notification_transactions: txAlerts,
        notification_daily_summary: dailySummary,
      })
      .eq("id", merchant.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold text-lg text-foreground">Notifications</h2>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => setTxAlerts(!txAlerts)}
          className="flex items-center justify-between bg-card border border-border rounded-xl p-4"
        >
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Transaction Alerts</p>
            <p className="text-xs text-muted-foreground">Get notified for every payment</p>
          </div>
          <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${txAlerts ? "bg-primary" : "bg-muted"}`}>
            <div className={`w-5 h-5 rounded-full bg-primary-foreground shadow transition-transform ${txAlerts ? "translate-x-5" : "translate-x-0"}`} />
          </div>
        </button>

        <button
          onClick={() => setDailySummary(!dailySummary)}
          className="flex items-center justify-between bg-card border border-border rounded-xl p-4"
        >
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Daily Summary</p>
            <p className="text-xs text-muted-foreground">Receive end-of-day sales report</p>
          </div>
          <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${dailySummary ? "bg-primary" : "bg-muted"}`}>
            <div className={`w-5 h-5 rounded-full bg-primary-foreground shadow transition-transform ${dailySummary ? "translate-x-5" : "translate-x-0"}`} />
          </div>
        </button>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-6 w-full bg-primary text-primary-foreground rounded-xl py-4 font-display font-bold text-base disabled:opacity-40 transition-all flex items-center justify-center gap-2"
      >
        <Save className="w-4 h-4" />
        {saving ? "Saving..." : saved ? "Saved ✓" : "Save Preferences"}
      </button>
    </div>
  );
};

export default NotificationSettings;
