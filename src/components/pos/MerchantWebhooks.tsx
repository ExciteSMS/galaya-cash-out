import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, Copy, Webhook as WebhookIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  last_status: string | null;
  last_delivery_at: string | null;
}

const EVENT_OPTIONS = ["payment.success", "payment.failed", "refund.created", "withdrawal.completed"];

const MerchantWebhooks = ({ onBack }: { onBack: () => void }) => {
  const [hooks, setHooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState<string[]>(["payment.success"]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("merchant_webhooks").select("*").order("created_at", { ascending: false });
    setHooks((data || []) as Webhook[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addHook = async () => {
    if (!newUrl.startsWith("https://")) {
      toast.error("URL must start with https://");
      return;
    }
    const { data: m } = await supabase.from("merchants").select("id").maybeSingle();
    if (!m) return;
    const { error } = await supabase.from("merchant_webhooks").insert({
      merchant_id: m.id,
      url: newUrl,
      events: newEvents,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewUrl("");
    setNewEvents(["payment.success"]);
    toast.success("Webhook added");
    load();
  };

  const toggleActive = async (h: Webhook) => {
    await supabase.from("merchant_webhooks").update({ is_active: !h.is_active }).eq("id", h.id);
    load();
  };

  const removeHook = async (id: string) => {
    await supabase.from("merchant_webhooks").delete().eq("id", id);
    toast.success("Removed");
    load();
  };

  const copy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast.success("Copied");
  };

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-display font-bold text-lg flex items-center gap-2">
          <WebhookIcon className="w-5 h-5" /> Webhooks
        </h2>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 mb-4 space-y-3">
        <p className="text-xs text-muted-foreground">Add an endpoint to receive event notifications</p>
        <input
          type="url"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="https://your-server.com/webhook"
          className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none"
        />
        <div className="flex flex-wrap gap-1">
          {EVENT_OPTIONS.map((ev) => (
            <button
              key={ev}
              onClick={() =>
                setNewEvents((p) => (p.includes(ev) ? p.filter((e) => e !== ev) : [...p, ev]))
              }
              className={`text-[10px] px-2 py-1 rounded-full border ${
                newEvents.includes(ev)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground"
              }`}
            >
              {ev}
            </button>
          ))}
        </div>
        <button
          onClick={addHook}
          className="w-full bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Webhook
        </button>
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-6">Loading...</p>
      ) : hooks.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">No webhooks yet</p>
      ) : (
        <div className="space-y-2">
          {hooks.map((h) => (
            <div key={h.id} className="bg-card border border-border rounded-xl p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium break-all">{h.url}</p>
                <button onClick={() => removeHook(h.id)} className="text-destructive flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {h.events.map((ev) => (
                  <span key={ev} className="text-[10px] px-2 py-0.5 bg-accent rounded-full">{ev}</span>
                ))}
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-muted-foreground">Secret:</span>
                <code className="bg-muted rounded px-1.5 py-0.5 truncate flex-1">{h.secret}</code>
                <button onClick={() => copy(h.secret)} className="text-primary">
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  {h.last_delivery_at ? `Last: ${new Date(h.last_delivery_at).toLocaleString()}` : "Never delivered"}
                </span>
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={h.is_active} onChange={() => toggleActive(h)} />
                  Active
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MerchantWebhooks;
