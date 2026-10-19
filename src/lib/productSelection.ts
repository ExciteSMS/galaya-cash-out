export interface SelectableProduct {
  id: string;
  name: string;
  price: number;
  stock_qty: number;
  sku: string | null;
  barcode: string | null;
  low_stock_threshold: number;
}

export function matchesProduct(product: SelectableProduct, query: string) {
  const normalized = query.trim().toLowerCase();
  return [product.name, product.sku, product.barcode].some(value => value?.toLowerCase().includes(normalized));
}

export function updateProductQuantity(cart: Record<string, number>, product: SelectableProduct, delta: number) {
  const next = (cart[product.id] || 0) + delta;
  if (next > product.stock_qty) return cart;
  if (next <= 0) {
    const copy = { ...cart };
    delete copy[product.id];
    return copy;
  }
  return { ...cart, [product.id]: next };
}

// Exact barcode or SKU match, used for scanner input where substring search would be ambiguous.
export function findProductByCode<T extends SelectableProduct>(products: T[], code: string): T | undefined {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return undefined;
  return products.find(p => p.barcode?.toLowerCase() === normalized || p.sku?.toLowerCase() === normalized);
}
