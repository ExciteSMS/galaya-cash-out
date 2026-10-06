import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Plus, Package, AlertTriangle, Trash2, Pencil, ScanBarcode } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  stock_qty: number;
  low_stock_threshold: number;
  is_active: boolean;
}

const emptyForm = { name: "", sku: "", barcode: "", price: "", stock_qty: "", low_stock_threshold: "5" };

export default function InventoryManager({ onBack }: { onBack: () => void }) {
  const { merchant } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!merchant) return;
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("merchant_id", merchant.id)
      .order("name");
    if (error) toast.error(error.message);
    setProducts((data as Product[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [merchant]);

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku || "",
      barcode: p.barcode || "",
      price: String(p.price),
      stock_qty: String(p.stock_qty),
      low_stock_threshold: String(p.low_stock_threshold),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!merchant || !form.name.trim() || !form.price) {
      toast.error("Name and price are required");
      return;
    }
    setSaving(true);
    const payload = {
      merchant_id: merchant.id,
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      barcode: form.barcode.trim() || null,
      price: Number(form.price),
      stock_qty: Number(form.stock_qty) || 0,
      low_stock_threshold: Number(form.low_stock_threshold) || 5,
    };
    const { error } = editing
      ? await supabase.from("products").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Product updated" : "Product added");
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Product removed");
    load();
  };

  const adjustStock = async (p: Product, delta: number) => {
    const next = Math.max(0, p.stock_qty + delta);
    await supabase.from("products").update({ stock_qty: next, updated_at: new Date().toISOString() }).eq("id", p.id);
    load();
  };

  const lowStock = products.filter((p) => p.stock_qty <= p.low_stock_threshold);

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" /> Inventory
          </h2>
          <p className="text-xs text-muted-foreground">{products.length} products · {lowStock.length} low stock</p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }}
          className="flex items-center gap-1 bg-primary text-primary-foreground text-xs font-medium px-3 py-2 rounded-lg"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 mb-4 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-destructive">Low stock alert</p>
            <p className="text-[11px] text-muted-foreground">
              {lowStock.map((p) => p.name).join(", ")} {lowStock.length === 1 ? "is" : "are"} running low.
            </p>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4 space-y-3">
          <p className="text-sm font-medium text-foreground">{editing ? "Edit Product" : "New Product"}</p>
          <input
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground"
            placeholder="Product name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground"
              placeholder="SKU (optional)"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
            />
            <div className="relative">
              <ScanBarcode className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="w-full bg-muted border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground"
                placeholder="Barcode"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground"
              placeholder="Price (K)"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <input
              type="number"
              className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground"
              placeholder="Stock"
              value={form.stock_qty}
              onChange={(e) => setForm({ ...form, stock_qty: e.target.value })}
            />
            <input
              type="number"
              className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground"
              placeholder="Low at"
              value={form.low_stock_threshold}
              onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-primary text-primary-foreground text-sm font-medium py-2 rounded-lg disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditing(null); }}
              className="px-4 bg-muted text-muted-foreground text-sm rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No products yet. Add your first product above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    K{p.price} {p.barcode ? `· ${p.barcode}` : ""} {p.sku ? `· ${p.sku}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(p)} className="p-1.5 text-muted-foreground hover:text-foreground">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className={`text-[11px] font-medium ${p.stock_qty <= p.low_stock_threshold ? "text-destructive" : "text-muted-foreground"}`}>
                  Stock: {p.stock_qty}
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => adjustStock(p, -1)} className="w-6 h-6 bg-muted rounded text-xs text-foreground">−</button>
                  <button onClick={() => adjustStock(p, 1)} className="w-6 h-6 bg-muted rounded text-xs text-foreground">+</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
