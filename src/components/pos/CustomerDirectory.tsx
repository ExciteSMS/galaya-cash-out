import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Search, Phone, Mail, User, Trash2, Edit2, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  total_transactions: number;
  total_spent: number;
  last_transaction_at: string | null;
}

interface Props {
  onBack: () => void;
  onSelectCustomer?: (phone: string) => void;
}

export default function CustomerDirectory({ onBack, onSelectCustomer }: Props) {
  const { merchant } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [loading, setLoading] = useState(true);

  const merchantId = merchant?.id;

  const load = async () => {
    if (!merchantId) return;
    const { data } = await supabase
      .from("customer_directory")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("total_spent", { ascending: false });
    setCustomers((data as Customer[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [merchantId]);

  const handleSave = async () => {
    if (!merchantId || !form.name || !form.phone) return;
    try {
      if (editId) {
        await supabase.from("customer_directory").update({
          name: form.name, phone: form.phone, email: form.email || null, notes: form.notes || null,
        }).eq("id", editId);
        toast.success("Customer updated");
      } else {
        await supabase.from("customer_directory").insert({
          merchant_id: merchantId, name: form.name, phone: form.phone,
          email: form.email || null, notes: form.notes || null,
        });
        toast.success("Customer added");
      }
      setShowAdd(false); setEditId(null);
      setForm({ name: "", phone: "", email: "", notes: "" });
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("customer_directory").delete().eq("id", id);
    toast.success("Customer removed");
    load();
  };

  const startEdit = (c: Customer) => {
    setEditId(c.id);
    setForm({ name: c.name, phone: c.phone, email: c.email || "", notes: c.notes || "" });
    setShowAdd(true);
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h2 className="font-display font-bold text-lg text-foreground">Customer Directory</h2>
      </div>

      <div className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="w-full bg-card border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <button onClick={() => { setShowAdd(true); setEditId(null); setForm({ name: "", phone: "", email: "", notes: "" }); }}
          className="bg-primary text-primary-foreground rounded-xl px-3 flex items-center gap-1 text-sm font-medium">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {showAdd && (
        <div className="bg-card border border-border rounded-xl p-4 mb-3 space-y-2">
          <div className="flex justify-between items-center mb-1">
            <p className="text-sm font-bold text-foreground">{editId ? "Edit" : "New"} Customer</p>
            <button onClick={() => { setShowAdd(false); setEditId(null); }}><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Full name *" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="Phone number *" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
          <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="Email (optional)" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
          <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Notes (optional)" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
          <button onClick={handleSave} disabled={!form.name || !form.phone}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-1">
            <Check className="w-4 h-4" /> {editId ? "Update" : "Save"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <User className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">{search ? "No matching customers" : "No customers yet"}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 overflow-y-auto flex-1">
          {filtered.map(c => (
            <div key={c.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0" onClick={() => onSelectCustomer?.(c.phone)}>
                <div className="w-9 h-9 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-accent-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" />{c.phone}</span>
                    {c.email && <span className="flex items-center gap-0.5"><Mail className="w-3 h-3" />{c.email}</span>}
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    {c.total_transactions} txns · K{Number(c.total_spent).toLocaleString()} spent
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => startEdit(c)} className="p-1.5 rounded-lg hover:bg-muted"><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
