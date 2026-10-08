import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Search, Package, Plus, Minus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

interface ProductSelectProps {
  onDone: (total: number, items: CartItem[]) => void;
  onCancel: () => void;
}

interface ProductRow {
  id: string;
  name: string;
  price: number;
  stock_qty: number;
}

const ProductSelect = ({ onDone, onCancel }: ProductSelectProps) => {
  const { merchant } = useAuth();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = async () => {
      if (!merchant) return;
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, name, price, stock_qty")
          .eq("merchant_id", merchant.id)
          .eq("is_active", true)
          .gt("stock_qty", 0)
          .order("name");
        if (error) throw error;
        setProducts((data || []) as ProductRow[]);
      } catch {
        toast.error("Could not load products");
      }
      setLoading(false);
    };
    load();
  }, [merchant]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const cartItems: CartItem[] = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const p = products.find((x) => x.id === id);
        return p ? { id, name: p.name, price: p.price, qty } : null;
      })
      .filter((x): x is CartItem => x !== null);
  }, [cart, products]);

  const total = cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);

  const changeQty = (p: ProductRow, delta: number) => {
    setCart((prev) => {
      const current = prev[p.id] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[p.id];
        return copy;
      }
      if (next > p.stock_qty) return prev;
      return { ...prev, [p.id]: next };
    });
  };

  const handleDone = () => {
    if (cartItems.length === 0) return;
    if (total < 10) {
      toast.error("Minimum sale amount is K10");
      return;
    }
    onDone(total, cartItems);
  };

  return (
    <div className="flex flex-col h-full p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <button onClick={onCancel} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h2 className="font-display font-bold text-lg text-foreground">Select Products</h2>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full bg-card border border-border rounded-xl py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
        />
      </div>

      {/* Product list */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Package className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? "No products match your search" : "No products in stock yet"}
            </p>
            {!search && (
              <p className="text-xs text-muted-foreground mt-1">
                Add them under Settings → Inventory
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2 pb-2">
            {filtered.map((p) => {
              const qty = cart[p.id] || 0;
              return (
                <div
                  key={p.id}
                  className={`bg-card border rounded-xl p-3 flex items-center justify-between transition-colors ${
                    qty > 0 ? "border-primary" : "border-border"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      K{p.price.toLocaleString()} · {p.stock_qty} in stock
                    </p>
                  </div>
                  {qty === 0 ? (
                    <button
                      onClick={() => changeQty(p, 1)}
                      className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center hover:bg-primary hover:text-primary-foreground text-accent-foreground transition-colors active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => changeQty(p, -1)}
                        className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-foreground active:scale-95 transition-transform"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-bold text-foreground w-5 text-center">{qty}</span>
                      <button
                        onClick={() => changeQty(p, 1)}
                        disabled={qty >= p.stock_qty}
                        className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-accent-foreground hover:bg-primary hover:text-primary-foreground disabled:opacity-40 active:scale-95 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart bar */}
      {cartItems.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-3 mt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShoppingBag className="w-3.5 h-3.5" />
              {cartItems.reduce((s, i) => s + i.qty, 0)} item(s)
            </span>
            <span className="font-display font-bold text-primary text-lg">
              K{total.toLocaleString()}
            </span>
          </div>
          <button
            onClick={handleDone}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3.5 font-display font-bold text-base hover:brightness-105 active:scale-[0.98] transition-all"
          >
            Continue to Payment
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductSelect;
