import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Beaker, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Rollout {
  id: string;
  feature_key: string;
  rollout_percent: number;
  notes: string;
}

const FEATURES = [
  "feature_qr_code", "feature_loyalty_points", "feature_staff_accounts",
  "feature_dark_mode", "feature_sms_receipt", "feature_customer_directory",
  "feature_tip", "feature_split_payment", "feature_offline_mode",
  "feature_webhooks", "feature_referrals",
];

export default function AdminFeatureRollouts() {
  const [rollouts, setRollouts] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("feature_rollouts").select("*");
      const map: Record<string, number> = {};
      const noteMap: Record<string, string> = {};
      FEATURES.forEach((f) => { map[f] = 100; noteMap[f] = ""; });
      (data || []).forEach((r: Rollout) => {
        map[r.feature_key] = r.rollout_percent;
        noteMap[r.feature_key] = r.notes || "";
      });
      setRollouts(map);
      setNotes(noteMap);
      setLoading(false);
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    for (const f of FEATURES) {
      await supabase.from("feature_rollouts").upsert(
        { feature_key: f, rollout_percent: rollouts[f] ?? 100, notes: notes[f] || "", updated_at: new Date().toISOString() },
        { onConflict: "feature_key" }
      );
    }
    setSaving(false);
    toast.success("Rollouts saved");
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <Beaker className="h-6 w-6 text-primary" />
          A/B Feature Rollouts
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Roll out features to a percentage of merchants before global launch.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rollout Percentages</CardTitle>
          <CardDescription>0% = disabled for everyone, 100% = enabled for all</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {FEATURES.map((f) => (
            <div key={f} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{f.replace("feature_", "").replace(/_/g, " ")}</span>
                <span className="text-sm font-bold font-display text-primary">{rollouts[f] ?? 100}%</span>
              </div>
              <Slider
                value={[rollouts[f] ?? 100]}
                min={0}
                max={100}
                step={5}
                onValueChange={(v) => setRollouts((p) => ({ ...p, [f]: v[0] }))}
              />
              <input
                type="text"
                value={notes[f] || ""}
                onChange={(e) => setNotes((p) => ({ ...p, [f]: e.target.value }))}
                placeholder="Notes (e.g. 'Beta cohort week 2')"
                className="w-full text-xs bg-muted rounded px-2 py-1 outline-none"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving}>
        <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Rollouts"}
      </Button>
    </div>
  );
}
