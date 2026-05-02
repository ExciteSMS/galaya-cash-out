import { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const TipSettings = ({ onBack }: { onBack: () => void }) => {
  const [enabled, setEnabled] = useState(true);
  const [defaultPercent, setDefaultPercent] = useState(10);
  const [presets, setPresets] = useState("5,10,15,20");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const k = localStorage.getItem("tip_settings");
    if (k) {
      try {
        const v = JSON.parse(k);
        setEnabled(v.enabled);
        setDefaultPercent(v.defaultPercent);
        setPresets(v.presets);
      } catch {}
    }
  }, []);

  const save = () => {
    setSaving(true);
    localStorage.setItem("tip_settings", JSON.stringify({ enabled, defaultPercent, presets }));
    setTimeout(() => {
      setSaving(false);
      toast.success("Tip settings saved");
    }, 300);
  };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-display font-bold text-lg">Tip / Service Charge</h2>
      </div>

      <div className="space-y-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Enable tipping</p>
            <p className="text-xs text-muted-foreground">Show tip prompt at checkout</p>
          </div>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-5 h-5"
          />
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <label className="text-xs text-muted-foreground">Default tip %</label>
          <input
            type="number"
            value={defaultPercent}
            onChange={(e) => setDefaultPercent(parseInt(e.target.value) || 0)}
            className="w-full text-xl font-bold bg-transparent outline-none"
          />
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <label className="text-xs text-muted-foreground">Quick presets (comma-separated %)</label>
          <input
            type="text"
            value={presets}
            onChange={(e) => setPresets(e.target.value)}
            className="w-full text-base bg-transparent outline-none"
          />
          <div className="flex gap-2 mt-3">
            {presets.split(",").map((p, i) => (
              <span key={i} className="px-3 py-1 bg-accent rounded-full text-xs font-medium">
                {p.trim()}%
              </span>
            ))}
          </div>
        </div>

        <div className="bg-muted rounded-xl p-3 text-xs text-muted-foreground">
          Tips are tracked separately from sale revenue and shown in your reports under "Tips collected".
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-display font-bold flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
};

export default TipSettings;
