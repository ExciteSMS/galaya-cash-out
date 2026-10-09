import { describe, it, expect } from "vitest";
import { matchesProduct, updateProductQuantity, type SelectableProduct } from "@/lib/productSelection";

const product: SelectableProduct = { id: "p1", name: "Milk", price: 20, stock_qty: 2, sku: "DAIRY-01", barcode: "260123456", low_stock_threshold: 5 };

describe("product selection", () => {
  it("finds products by name, SKU and barcode", () => {
    expect(matchesProduct(product, " milk ")).toBe(true);
    expect(matchesProduct(product, "dairy-01")).toBe(true);
    expect(matchesProduct(product, "260123456")).toBe(true);
    expect(matchesProduct(product, "bread")).toBe(false);
  });
  it("does not add more units than available stock", () => {
    expect(updateProductQuantity({ p1: 2 }, product, 1)).toEqual({ p1: 2 });
    expect(updateProductQuantity({ p1: 1 }, product, 1)).toEqual({ p1: 2 });
  });
  it("removes the item when its last unit is removed", () => {
    expect(updateProductQuantity({ p1: 1 }, product, -1)).toEqual({});
  });
});