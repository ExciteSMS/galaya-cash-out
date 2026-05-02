import { useState } from "react";
import { ArrowLeft, Plus, Trash2, Send } from "lucide-react";
import { detectProvider, validatePhone, processPayment, Provider } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Payee {
  id: string;
  phone: string;
  amount: string;
  provider: Provider | null;
}

const SplitPayment = ({ onBack }: { onBack: () => void }) => {
  const { merchant } = useAuth();
  const [totalStr, setTotalStr] = useState("");
  const [payees, setPayees] = useState<Payee[]>([
    { id: crypto.randomUUID(), phone: "", amount: "", provider: null },
    { id: crypto.randomUUID(), phone: "", amount: "", provider: null },
  ]);
  const [sending, setSending] = useState(false);

  const total = parseFloat(totalStr) || 0;
  const allocated = payees.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const remaining = total - allocated;

  const updatePayee = (id: string, patch: Partial<Payee>) => {
    setPayees((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const next = { ...p, ...patch };
        if (patch.phone !== undefined && next.phone.length === 10) {
          next.provider = detectProvider(next.phone);
        }
        return next;
      })
    );
  };

  const addPayee = () =>
    setPayees((prev) => [...prev, { id: crypto.randomUUID(), phone: "", amount: "", provider: null }]);

  const removePayee = (id: string) =>
    setPayees((prev) => (prev.length > 2 ? prev.filter((p) => p.id !== id) : prev));

  const splitEvenly = () => {
    if (total <= 0 || payees.length === 0) return;
    const each = Math.floor((total / payees.length) * 100) / 100;
    setPayees((prev) => prev.map((p) => ({ ...p, amount: String(each) })));
  };

  const handleSend = async () => {
    if (!merchant) return;
    if (Math.abs(remaining) > 0.01) {
      toast.error("Allocated amount must equal total");
      return;
    }
    for (const p of payees) {
      if (!validatePhone(p.phone) || !p.provider) {
        toast.error("Invalid phone for one of the payees");
        return;
      }
      if ((parseFloat(p.amount) || 0) <= 0) {
        toast.error("Each payee must have an amount");
        return;
      }
    }
    setSending(true);
    const groupId = crypto.randomUUID();
    let successCount = 0;
    for (const p of payees) {
      try {
        const result = await processPayment(merchant.id, p.provider!, p.phone, parseFloat(p.amount));
        if (result.success && result.transaction?.id) {
          await supabase
            .from("transactions")
            .update({ split_group_id: groupId })
            .eq("id", result.transaction.id);
          successCount++;
        }
      } catch (e: any) {
        toast.error(`Payee ${p.phone}: ${e.message}`);
      }
    }
    setSending(false);
    toast.success(`${successCount}/${payees.length} payment requests sent`);
    if (successCount === payees.length) onBack();
  };

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h2 className="font-display font-bold text-lg text-foreground">Split Payment</h2>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <label className="text-xs text-muted-foreground">Total bill (ZMW)</label>
        <input
          type="number"
          inputMode="decimal"
          value={totalStr}
          onChange={(e) => setTotalStr(e.target.value)}
          placeholder="0"
          className="w-full text-2xl font-bold font-display bg-transparent outline-none text-foreground"
        />
        <div className="flex justify-between items-center mt-2 text-xs">
          <span className="text-muted-foreground">Allocated: K{allocated.toFixed(2)}</span>
          <span className={remaining === 0 ? "text-success" : "text-destructive"}>
            Remaining: K{remaining.toFixed(2)}
          </span>
        </div>
        <button onClick={splitEvenly} className="mt-2 text-xs text-primary font-medium hover:underline">
          Split evenly
        </button>
      </div>

      <div className="space-y-2 mb-3">
        {payees.map((p, i) => (
          <div key={p.id} className="bg-card border border-border rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Payee {i + 1}</span>
              {payees.length > 2 && (
                <button onClick={() => removePayee(p.id)} className="text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="tel"
                value={p.phone}
                onChange={(e) => updatePayee(p.id, { phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                placeholder="0XX XXX XXXX"
                className="bg-muted rounded-lg px-3 py-2 text-sm outline-none"
              />
              <input
                type="number"
                inputMode="decimal"
                value={p.amount}
                onChange={(e) => updatePayee(p.id, { amount: e.target.value })}
                placeholder="Amount"
                className="bg-muted rounded-lg px-3 py-2 text-sm outline-none"
              />
            </div>
            {p.provider && (
              <p className="text-[10px] text-muted-foreground mt-1">Provider: {p.provider}</p>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addPayee}
        className="flex items-center justify-center gap-2 text-sm font-medium text-primary border border-dashed border-border rounded-xl py-3 mb-3 hover:bg-muted"
      >
        <Plus className="w-4 h-4" /> Add another payee
      </button>

      <button
        onClick={handleSend}
        disabled={sending || total <= 0 || Math.abs(remaining) > 0.01}
        className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-display font-bold disabled:opacity-40 flex items-center justify-center gap-2"
      >
        <Send className="w-4 h-4" />
        {sending ? "Sending..." : `Send ${payees.length} USSD pushes`}
      </button>
    </div>
  );
};

export default SplitPayment;
