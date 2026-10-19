import { useEffect, useState } from "react";
import { getSettings, upsertSetting, logAudit } from "@/lib/adminApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Smartphone } from "lucide-react";

const FIELDS = [
  { key: "app_web_version", label: "Latest web version (OTA)", hint: "e.g. 1.2.0. Apps download the bundle when this is newer than theirs." },
  { key: "app_web_bundle_url", label: "Web bundle URL (zip of dist/)", hint: "Public link to the zipped build." },
  { key: "app_min_native_version", label: "Minimum native app version", hint: "Older installs are blocked until updated from the store." },
  { key: "app_store_url_android", label: "Play Store URL", hint: "" },
  { key: "app_store_url_ios", label: "App Store URL", hint: "" },
];

export default function AppUpdatesCard() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings().then((rows) => {
      const m: Record<string, string> = {};
      rows.forEach((r) => (m[r.key] = r.value));
      setValues(m);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all(FIELDS.map((f) => upsertSetting(f.key, (values[f.key] ?? "").trim())));
      await logAudit("app_updates_updated", "app_settings", undefined, { keys: FIELDS.map((f) => f.key) });
      toast.success("Update settings saved");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-primary" /> App updates</CardTitle>
        <CardDescription>Controls auto-updates for the Android and iOS apps.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {FIELDS.map((f) => (
          <div key={f.key} className="space-y-1">
            <Label htmlFor={f.key}>{f.label}</Label>
            <Input id={f.key} value={values[f.key] ?? ""} onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))} />
            {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
          </div>
        ))}
        <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
      </CardContent>
    </Card>
  );
}
