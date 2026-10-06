import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, PauseCircle, Play, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ParkedSale {
  id: string;
  label: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  status: string;
  created_at: string;
}

export default function ParkedSales({ onBack }: { onBack: () => void }) {
  const { merchant } = useAuth();
  const [parked, setParked] = useState<ParkedSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [total, setTotal] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!merchant) return;
    const { data, error } = await supabase
      .from("parked_sales")
      .select("*")
      .eq("merchant_id", merchant.id)
      .eq("status", "parked")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setParked((data as ParkedSale[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [merchant]);

  const handlePark = async () => {
    if (!merchant || !label.trim() || !total) {
      toast.error("Label and amount are required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("parked_sales").insert({
      merchant_id: merchant.id,
      label: label.trim(),
      total: Number(total),
      items: note.trim() ? [{ name: note.trim(), qty: 1, price: Number(total) }] : [],
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Sale parked");
    setShowForm(false);
    setLabel("");
    setTotal("");
    setNote("");
    load();
  };

  const handleResume = async (sale: ParkedSale) => {
    const { error } = await supabase
      .from("parked_sales")
      .update({ status: "resumed", resumed_at: new Date().toISOString() })
      .eq("id", sale.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Resumed "${sale.label}" — K${sale.total} ready to charge`);
    load();
  };

  const handleDiscard = async (id: string) => {
    const { error } = await supabase.from("parked_sales").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Parked sale discarded");
    load();
  };

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
            <PauseCircle className="w-5 h-5 text-primary" /> Parked Sales
          </h2>
          <p className="text-xs text-muted-foreground">{parked.length} on hold</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 bg-primary text-primary-foreground text-xs font-medium px-3 py-2 rounded-lg"
        >
          <Plus className="w-4 h-4" /> Park Sale
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Park a sale</p>
          <input
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground"
            placeholder="Label (e.g. Table 4, customer name)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <input
            type="number"
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground"
            placeholder="Total amount (K)"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
          />
          <input
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={handlePark}
              disabled={saving}
              className="flex-1 bg-primary text-primary-foreground text-sm font-medium py-2 rounded-lg disabled:opacity-50"
            >
              {saving ? "Saving..." : "Park"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 bg-muted text-muted-foreground text-sm rounded-lg">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : parked.length === 0 ? (
        <div className="text-center py-12">
          <PauseCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No parked sales. Park a sale to resume it later.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {parked.map((sale) => (
            <div key={sale.id} className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{sale.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {format(new Date(sale.created_at), "dd MMM, HH:mm")}
                    {sale.items?.[0]?.name ? ` · ${sale.items[0].name}` : ""}
                  </p>
                </div>
                <p className="text-sm font-bold text-foreground font-mono">K{sale.total}</p>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleResume(sale)}
                  className="flex-1 flex items-center justify-center gap-1 bg-primary/10 text-primary text-xs font-medium py-1.5 rounded-lg"
                >
                  <Play className="w-3.5 h-3.5" /> Resume
                </button>
                <button
                  onClick={() => handleDiscard(sale.id)}
                  className="flex items-center justify-center gap-1 bg-muted text-muted-foreground text-xs px-3 py-1.5 rounded-lg hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Discard
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
