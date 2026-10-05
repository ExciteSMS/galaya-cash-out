import { useEffect, useState } from "react";
import { ArrowLeft, Save, PlugZap, Loader2, Power } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ZraSettings = ({ onBack }: { onBack: () => void }) => {
  const { merchant } = useAuth();
  const [form, setForm] = useState({ enabled: false, tpin: "", bhf_id: "000", dvc_srl_no: "", vsdc_url: "", tax_type: "A" });
  const [initializedAt, setInitializedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    if (!merchant?.id) return;
    supabase.from("merchant_zra_settings").select("*").eq("merchant_id", merchant.id).maybeSingle().then(({ data }) => {
      if (data) {
        setForm({ enabled: data.enabled, tpin: data.tpin, bhf_id: data.bhf_id, dvc_srl_no: data.dvc_srl_no, vsdc_url: data.vsdc_url, tax_type: data.tax_type });
        setInitializedAt(data.initialized_at);
      }
    });
    supabase.from("zra_invoices").select("id, invoice_no, invoice_type, amount, status, rcpt_no, created_at")
      .eq("merchant_id", merchant.id).order("created_at", { ascending: false }).limit(10)
      .then(({ data }) => setRecent(data || []));
  }, [merchant?.id]);

  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!merchant?.id) return;
    if (form.enabled && (!/^\d{10}$/.test(form.tpin) || !form.dvc_srl_no || !/^https?:\/\//.test(form.vsdc_url))) {
      toast.error("Enter a 10-digit TPIN, device serial and VSDC address (http://…)");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("merchant_zra_settings")
      .upsert({ merchant_id: merchant.id, ...form, updated_at: new Date().toISOString() }, { onConflict: "merchant_id" });
    setSaving(false);
    error ? toast.error("Could not save") : toast.success("ZRA settings saved");
  };

  const test = async () => {
    setTesting(true);
    await save();
    const { data, error } = await supabase.functions.invoke("zra-invoice", { body: { action: "init", merchant_id: merchant?.id } });
    setTesting(false);
    if (data?.success) { toast.success("Connected to ZRA device"); setInitializedAt(new Date().toISOString()); }
    else toast.error(data?.message || data?.error || error?.message || "Could not reach ZRA device");
  };

  const initialize = async () => {
    setInitializing(true);
    await save();
    const { data, error } = await supabase.functions.invoke("zra-invoice", { body: { action: "init", merchant_id: merchant?.id } });
    setInitializing(false);
    if (data?.success) {
      setInitializedAt(new Date().toISOString());
      toast.success(data.resultCd === "902" ? "Device already initialized with ZRA" : "Device initialized with ZRA");
    } else {
      toast.error(data?.message || data?.error || error?.message || "Initialization failed — check TPIN, serial and VSDC address");
    }
  };

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted"><ArrowLeft className="w-5 h-5" /></button>
        <h2 className="font-display font-bold text-lg">ZRA Smart Invoice</h2>
      </div>

      <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border mb-4">
        <div>
          <p className="text-sm font-medium">Report sales to ZRA</p>
          <p className="text-xs text-muted-foreground">Every paid sale and refund is sent automatically</p>
        </div>
        <Switch checked={form.enabled} onCheckedChange={(v) => set("enabled", v)} />
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-xs text-muted-foreground">TPIN<Input value={form.tpin} onChange={(e) => set("tpin", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="1000000000" className="mt-1 font-mono" /></label>
        <label className="text-xs text-muted-foreground">Branch ID<Input value={form.bhf_id} onChange={(e) => set("bhf_id", e.target.value)} placeholder="000" className="mt-1 font-mono" /></label>
        <label className="text-xs text-muted-foreground">Device serial number<Input value={form.dvc_srl_no} onChange={(e) => set("dvc_srl_no", e.target.value)} className="mt-1 font-mono" /></label>
        <label className="text-xs text-muted-foreground">VSDC address<Input value={form.vsdc_url} onChange={(e) => set("vsdc_url", e.target.value.trim())} placeholder="http://your-vsdc-host:8080/zrasandboxvsdc" className="mt-1 font-mono" /></label>
        <div className="text-xs text-muted-foreground">Tax type
          <Select value={form.tax_type} onValueChange={(v) => set("tax_type", v)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="A">A — Standard VAT 16%</SelectItem>
              <SelectItem value="C1">C1 — Zero rated</SelectItem>
              <SelectItem value="D">D — Exempt</SelectItem>
              <SelectItem value="TOT">TOT — Turnover tax</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mt-3">
        {initializedAt ? `Device connected ${new Date(initializedAt).toLocaleString()}` : "Device not yet connected"}
      </p>

      <Button onClick={initialize} disabled={initializing} className="w-full mt-4">
        {initializing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Power className="w-4 h-4 mr-1" />}
        Initialize Device
      </Button>
      <p className="text-[10px] text-muted-foreground mt-1">Registers this device with ZRA using your TPIN and serial number. Do this once before sending invoices.</p>

      <div className="flex gap-2 mt-3">
        <Button onClick={save} disabled={saving} variant="secondary" className="flex-1"><Save className="w-4 h-4 mr-1" />Save</Button>
        <Button onClick={test} disabled={testing} variant="outline" className="flex-1">
          {testing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <PlugZap className="w-4 h-4 mr-1" />}Test connection
        </Button>
      </div>

      {recent.length > 0 && (
        <div className="mt-6">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Recent ZRA invoices</p>
          {recent.map((r) => (
            <div key={r.id} className="flex justify-between text-xs py-1.5 border-b border-border">
              <span className="font-mono">#{r.invoice_no} {r.invoice_type === "credit_note" ? "CN" : ""}</span>
              <span>K{Number(r.amount).toLocaleString()}</span>
              <span className={r.status === "success" ? "text-primary" : r.status === "failed" ? "text-destructive" : "text-muted-foreground"}>{r.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ZraSettings;
