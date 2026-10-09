import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Search, Package, Plus, Minus, ShoppingBag, X, ChevronDown, ChevronUp, ArrowRight, RotateCw, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { matchesProduct, updateProductQuantity, type SelectableProduct } from "@/lib/productSelection";
import { toast } from "sonner";

export interface CartItem { id: string; name: string; price: number; qty: number }
interface ProductSelectProps { onDone: (total: number, items: CartItem[]) => void; onCancel: () => void }
const money = (value: number) => `K${value.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ProductSelect = ({ onDone, onCancel }: ProductSelectProps) => {
  const { merchant } = useAuth();
  const [products, setProducts] = useState<SelectableProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [view, setView] = useState<"all" | "cart">("all");
  const [review, setReview] = useState(false);

  const load = useCallback(async () => {
    if (!merchant) return;
    setLoading(true);
    setError(false);
    const { data, error: loadError } = await supabase.from("products")
      .select("id, name, price, stock_qty, sku, barcode, low_stock_threshold")
      .eq("merchant_id", merchant.id).eq("is_active", true).gt("stock_qty", 0).order("name");
    if (loadError) setError(true);
    else setProducts(data || []);
    setLoading(false);
  }, [merchant?.id]);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => products.filter(p => matchesProduct(p, search) && (view === "all" || (cart[p.id] || 0) > 0)), [products, search, view, cart]);
  const cartItems = useMemo(() => products.filter(p => (cart[p.id] || 0) > 0).map(p => ({ id: p.id, name: p.name, price: p.price, qty: cart[p.id] })), [cart, products]);
  const total = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const count = cartItems.reduce((sum, item) => sum + item.qty, 0);
  const changeQty = (p: SelectableProduct, delta: number) => setCart(prev => updateProductQuantity(prev, p, delta));
  const handleDone = () => {
    if (!cartItems.length) return;
    if (total < 10) { toast.error("Minimum sale amount is K10"); return; }
    onDone(total, cartItems);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 px-4 pt-4 pb-3 border-b border-border space-y-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Back to sale" title="Back to sale" className="shrink-0"><ArrowLeft /></Button>
          <div className="min-w-0 flex-1"><h2 className="font-display font-bold text-lg">Select Products</h2><p className="text-xs text-muted-foreground">{loading ? "Loading inventory…" : `${products.length} available products`}</p></div>
          <ShoppingBag className="h-5 w-5 text-primary shrink-0" />
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input aria-label="Search products" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, SKU or barcode" className="w-full h-11 bg-card border border-border rounded-lg pl-9 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          {search && <Button variant="ghost" size="icon" onClick={() => setSearch("")} aria-label="Clear search" title="Clear search" className="absolute right-0.5 top-0.5"><X /></Button>}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1">
            <Button size="sm" variant={view === "all" ? "secondary" : "ghost"} aria-pressed={view === "all"} onClick={() => setView("all")}>All items</Button>
            <Button size="sm" variant={view === "cart" ? "secondary" : "ghost"} aria-pressed={view === "cart"} onClick={() => setView("cart")}>In cart ({cartItems.length})</Button>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{filtered.length} items</span>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {loading ? <div className="space-y-2" aria-label="Loading products">{[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-lg bg-muted animate-pulse motion-reduce:animate-none" />)}</div>
        : error ? <div className="text-center py-10 space-y-3"><AlertTriangle className="w-8 h-8 text-destructive mx-auto" /><p className="text-sm">Could not load products</p><Button variant="outline" onClick={() => void load()}><RotateCw /> Retry</Button></div>
        : filtered.length === 0 ? <div className="flex flex-col items-center py-10 text-center gap-3"><Package className="w-10 h-10 text-muted-foreground" /><p className="text-sm text-muted-foreground">{search ? "No matching products" : view === "cart" ? "Your cart is empty" : "No products in stock"}</p>{search && <Button variant="outline" size="sm" onClick={() => setSearch("")}>Clear search</Button>}</div>
        : <div className="grid grid-cols-1 gap-3">{filtered.map(p => {
          const qty = cart[p.id] || 0;
          const remaining = p.stock_qty - qty;
          return <article key={p.id} className={`rounded-lg border p-3 transition-colors ${qty ? "border-primary bg-accent/40" : "border-border bg-card"}`}>
            <div className="flex gap-3 items-start">
              <div className={`h-10 w-10 shrink-0 rounded-md flex items-center justify-center ${qty ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{qty ? <Check className="w-5 h-5" /> : <Package className="w-5 h-5" />}</div>
              <div className="min-w-0 flex-1"><h3 className="font-display text-sm font-semibold break-words">{p.name}</h3>{(p.sku || p.barcode) && <p className="text-[11px] text-muted-foreground break-all mt-0.5">{p.sku || p.barcode}</p>}</div>
              <span className="font-display font-bold text-primary text-base tabular-nums shrink-0">{money(p.price)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 mt-3">
              <div className="min-w-0"><p className={`text-xs ${remaining <= p.low_stock_threshold ? "text-destructive" : "text-muted-foreground"}`}>{remaining === 0 ? "Stock limit reached" : `${remaining} available`}{remaining > 0 && remaining <= p.low_stock_threshold ? " · Low stock" : ""}</p>{qty > 0 && <p className="text-xs mt-1 tabular-nums">Subtotal <span className="font-semibold">{money(p.price * qty)}</span></p>}</div>
              <div className="flex items-center gap-1 shrink-0">
                {qty > 0 && <><Button variant="secondary" size="icon" onClick={() => changeQty(p, -1)} aria-label={`Remove one ${p.name}`} title={`Remove one ${p.name}`} className="h-10 w-10"><Minus /></Button><span className="w-8 text-center text-sm font-bold tabular-nums" aria-label={`${p.name} quantity`}>{qty}</span></>}
                <Button variant={qty ? "default" : "secondary"} size="icon" onClick={() => changeQty(p, 1)} disabled={qty >= p.stock_qty} aria-label={`Add ${p.name}`} title={`Add ${p.name}`} className="h-10 w-10"><Plus /></Button>
              </div>
            </div>
          </article>;
        })}</div>}
      </div>

      <footer className="shrink-0 border-t border-border bg-background p-4 space-y-3">
        {review && cartItems.length > 0 && <div className="max-h-32 overflow-y-auto divide-y divide-border">{cartItems.map(item => <div key={item.id} className="flex items-center gap-2 py-2 text-xs"><span className="min-w-0 flex-1 break-words">{item.qty} × {item.name}</span><span className="tabular-nums shrink-0">{money(item.price * item.qty)}</span><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Remove ${item.name} from cart`} title={`Remove ${item.name}`} onClick={() => setCart(prev => { const next = { ...prev }; delete next[item.id]; return next; })}><X /></Button></div>)}</div>}
        <div className="flex justify-between items-center gap-2">
          <Button variant="ghost" size="sm" disabled={!count} aria-expanded={review} onClick={() => setReview(!review)} className="px-0"><ShoppingBag /><span>{count} {count === 1 ? "item" : "items"}</span>{review ? <ChevronDown /> : <ChevronUp />}</Button>
          <span className="font-display text-xl font-bold text-primary tabular-nums">{money(total)}</span>
        </div>
        <Button onClick={handleDone} disabled={!count} className="w-full h-12 font-display font-bold">Continue to Payment <ArrowRight /></Button>
      </footer>
    </div>
  );
};
export default ProductSelect;
