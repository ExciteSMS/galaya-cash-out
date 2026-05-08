import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MessageSquare, Send, Clock, Users, Phone, BookmarkPlus, Trash2, FileText, Pencil } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

type Mode = "all_merchants" | "select_merchants" | "custom_numbers";

interface SmsTemplate {
  id: string;
  name: string;
  category: string;
  message: string;
  is_active: boolean;
  updated_at: string;
}

interface Merchant {
  id: string;
  name: string;
  phone_number: string;
  status: string;
}

interface SmsLog {
  id: string;
  recipient: string;
  message: string;
  category: string;
  status: string;
  created_at: string;
}

const TEMPLATES: { label: string; category: string; text: string }[] = [
  { label: "Custom", category: "custom", text: "" },
  { label: "Receipt", category: "receipt", text: "Galaya: Payment of K{amount} confirmed. Ref: {reference}. Thank you!" },
  { label: "Promotion", category: "promo", text: "Galaya: Special offer for you! {details}. Reply STOP to opt out." },
  { label: "Reminder", category: "reminder", text: "Galaya reminder: {details}." },
  { label: "Maintenance", category: "system", text: "Galaya: Scheduled maintenance on {date}. Service may be briefly unavailable." },
];

export default function AdminCustomSMS() {
  const [mode, setMode] = useState<Mode>("all_merchants");
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [numbers, setNumbers] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("custom");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<SmsLog[]>([]);
  const [search, setSearch] = useState("");
  const [vars, setVars] = useState<Record<string, string>>({});
  const [savedTemplates, setSavedTemplates] = useState<SmsTemplate[]>([]);
  const [tplDialogOpen, setTplDialogOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [editingTplId, setEditingTplId] = useState<string | null>(null);

  // Auto-filled by the server from the merchant's latest transaction / profile
  const AUTO_TOKENS = new Set(["amount", "reference", "merchant", "date"]);
  // Detect {placeholder} tokens that the user must fill manually
  const placeholders = Array.from(
    new Set((message.match(/\{(\w+)\}/g) || []).map((m) => m.slice(1, -1)))
  ).filter((k) => !AUTO_TOKENS.has(k));

  const fillPlaceholders = (text: string) =>
    text.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? "").trim() || `{${k}}`);

  useEffect(() => {
    loadMerchants();
    loadHistory();
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const { data } = await (supabase as any)
      .from("sms_templates")
      .select("*")
      .order("updated_at", { ascending: false });
    setSavedTemplates(data || []);
  };

  const openSaveTemplate = () => {
    if (!message.trim()) {
      toast.error("Write a message first");
      return;
    }
    setEditingTplId(null);
    setTplName("");
    setTplDialogOpen(true);
  };

  const editTemplate = (t: SmsTemplate) => {
    setEditingTplId(t.id);
    setTplName(t.name);
    setMessage(t.message);
    setCategory(t.category);
    setTplDialogOpen(true);
  };

  const saveTemplate = async () => {
    if (!tplName.trim() || !message.trim()) {
      toast.error("Name and message are required");
      return;
    }
    const payload = { name: tplName.trim(), category, message, is_active: true };
    let error;
    if (editingTplId) {
      ({ error } = await (supabase as any).from("sms_templates").update(payload).eq("id", editingTplId));
    } else {
      ({ error } = await (supabase as any).from("sms_templates").insert(payload));
    }
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editingTplId ? "Template updated" : "Template saved");
    setTplDialogOpen(false);
    setEditingTplId(null);
    setTplName("");
    loadTemplates();
  };

  const useTemplate = (t: SmsTemplate) => {
    setMessage(t.message);
    setCategory(t.category);
    setVars({});
    toast.success(`Loaded "${t.name}"`);
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    const { error } = await (supabase as any).from("sms_templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    loadTemplates();
  };

  const loadMerchants = async () => {
    const { data } = await supabase
      .from("merchants")
      .select("id, name, phone_number, status")
      .order("name");
    setMerchants(data || []);
  };

  const loadHistory = async () => {
    const { data } = await supabase
      .from("sms_log")
      .select("id, recipient, message, category, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    setHistory(data || []);
  };

  const applyTemplate = (idx: number) => {
    const t = TEMPLATES[idx];
    setMessage(t.text);
    setCategory(t.category);
  };

  const toggleMerchant = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Message is required");
      return;
    }

    // Auto-filled tokens (resolved server-side from DB)
    const AUTO_TOKENS = new Set(["amount", "reference", "merchant", "date"]);
    const finalMessage = fillPlaceholders(message);
    const remaining = (finalMessage.match(/\{(\w+)\}/g) || [])
      .map((m) => m.slice(1, -1))
      .filter((k) => !AUTO_TOKENS.has(k));
    if (remaining.length > 0) {
      toast.error(`Fill in placeholder values: ${remaining.join(", ")}`);
      return;
    }

    const payload: any = { mode: "custom", message: finalMessage, category };

    if (mode === "all_merchants") {
      payload.target = "all_merchants";
    } else if (mode === "select_merchants") {
      if (selectedIds.length === 0) {
        toast.error("Select at least one merchant");
        return;
      }
      payload.merchant_ids = selectedIds;
    } else {
      const list = numbers
        .split(/[\n,;\s]+/)
        .map((n) => n.trim())
        .filter(Boolean);
      if (list.length === 0) {
        toast.error("Enter at least one phone number");
        return;
      }
      payload.recipients = list;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", { body: payload });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Sent: ${data.sent} • Failed: ${data.failed} (of ${data.total})`);
      setMessage("");
      setSelectedIds([]);
      setNumbers("");
      setVars({});
      loadHistory();
    } catch (err: any) {
      toast.error(err.message || "Failed to send SMS");
    }
    setSending(false);
  };

  const filteredMerchants = merchants.filter(
    (m) =>
      !search ||
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.phone_number?.includes(search)
  );

  const charCount = message.length;
  const smsCount = Math.max(1, Math.ceil(charCount / 160));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          Custom SMS
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Send any SMS — receipts, promos, reminders — to merchants or any phone number
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compose SMS</CardTitle>
          <CardDescription>Uses Excite SMS gateway with sender ID configured in Settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {([
              { val: "all_merchants", label: "All merchants", icon: Users },
              { val: "select_merchants", label: "Choose merchants", icon: Users },
              { val: "custom_numbers", label: "Custom numbers", icon: Phone },
            ] as const).map((opt) => (
              <button
                key={opt.val}
                onClick={() => setMode(opt.val as Mode)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition ${
                  mode === opt.val
                    ? "bg-primary/10 border-primary text-primary"
                    : "border-border hover:bg-muted"
                }`}
              >
                <opt.icon className="h-4 w-4" />
                {opt.label}
              </button>
            ))}
          </div>

          {/* Recipients */}
          {mode === "select_merchants" && (
            <div className="space-y-2">
              <Input
                placeholder="Search merchants..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="max-h-56 overflow-y-auto border rounded-md divide-y">
                {filteredMerchants.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedIds.includes(m.id)}
                      onCheckedChange={() => toggleMerchant(m.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.phone_number}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{m.status}</Badge>
                  </label>
                ))}
                {filteredMerchants.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No merchants</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{selectedIds.length} selected</p>
            </div>
          )}

          {mode === "custom_numbers" && (
            <div className="space-y-1">
              <Label className="text-xs">Phone numbers (one per line, or comma-separated)</Label>
              <Textarea
                placeholder="0977123456&#10;260977654321&#10;+260966111222"
                value={numbers}
                onChange={(e) => setNumbers(e.target.value)}
                rows={4}
                className="font-mono text-sm"
              />
            </div>
          )}

          {/* Quick templates (built-in) */}
          <div>
            <Label className="text-xs text-muted-foreground">Quick start</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {TEMPLATES.map((t, i) => (
                <Button
                  key={t.label}
                  size="sm"
                  variant="outline"
                  onClick={() => applyTemplate(i)}
                  className="text-xs h-7"
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Saved templates (admin-created) */}
          <div className="rounded-md border p-3 space-y-2 bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Saved templates ({savedTemplates.length})
              </Label>
              <Button size="sm" variant="outline" onClick={openSaveTemplate} className="h-7 text-xs">
                <BookmarkPlus className="h-3.5 w-3.5 mr-1" />
                Save current as template
              </Button>
            </div>
            {savedTemplates.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No saved templates yet. Compose a message and save it for reuse.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
                {savedTemplates.map((t) => (
                  <div key={t.id} className="rounded border bg-background p-2 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{t.name}</span>
                      <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                    </div>
                    <p className="text-muted-foreground line-clamp-2">{t.message}</p>
                    <div className="flex items-center gap-1 pt-1">
                      <Button size="sm" variant="default" onClick={() => useTemplate(t)} className="h-6 text-[11px] px-2">
                        Use
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => editTemplate(t)} className="h-6 text-[11px] px-2">
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteTemplate(t.id)} className="h-6 text-[11px] px-2 text-destructive hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category + message */}
          <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom</SelectItem>
                <SelectItem value="receipt">Receipt</SelectItem>
                <SelectItem value="promo">Promotion</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="alert">Alert</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground self-center">
              {charCount} chars • {smsCount} SMS segment{smsCount > 1 ? "s" : ""}
            </div>
          </div>

          <Textarea
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
          />

          {placeholders.length > 0 && (
            <div className="space-y-2 p-3 rounded-md border border-dashed bg-muted/30">
              <Label className="text-xs">Fill in placeholders</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {placeholders.map((p) => (
                  <div key={p} className="space-y-1">
                    <Label className="text-[11px] font-mono text-muted-foreground">{`{${p}}`}</Label>
                    <Input
                      value={vars[p] || ""}
                      onChange={(e) => setVars((v) => ({ ...v, [p]: e.target.value }))}
                      placeholder={`Value for ${p}`}
                    />
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted-foreground pt-1">
                Preview: <span className="font-mono">{fillPlaceholders(message)}</span>
              </div>
            </div>
          )}

          <Button onClick={handleSend} disabled={sending} className="w-full sm:w-auto">
            <Send className="h-4 w-4 mr-2" />
            {sending ? "Sending..." : "Send SMS"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Recent SMS
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No SMS sent yet</p>
          ) : (
            <div className="space-y-2">
              {history.map((s) => (
                <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                  <Badge
                    variant="secondary"
                    className={`text-[10px] shrink-0 ${
                      s.status === "sent"
                        ? "bg-green-500/10 text-green-600"
                        : "bg-red-500/10 text-red-600"
                    }`}
                  >
                    {s.status}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-mono">{s.recipient}</p>
                      <Badge variant="outline" className="text-[10px]">{s.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{s.message}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {format(new Date(s.created_at), "MMM d HH:mm")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
