import { describe, expect, it } from "vitest";
import { parseInventoryCsv } from "@/lib/inventoryCsv";

describe("parseInventoryCsv", () => {
  it("parses rows, quotes and alternate headers", () => {
    const r = parseInventoryCsv('Name,Price,Qty,Barcode\n"Rice, 5kg",120.5,10,111\nSalt,10,,');
    expect(r.errors).toEqual([]);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toMatchObject({ name: "Rice, 5kg", price: 120.5, stock_qty: 10, barcode: "111" });
    expect(r.rows[1]).toMatchObject({ stock_qty: 0, barcode: null, low_stock_threshold: 5 });
  });

  it("reports bad rows without dropping good ones", () => {
    const r = parseInventoryCsv("name,price,stock\nA,x,1\n,5,1\nB,5,-2\nC,5,3");
    expect(r.rows.map((p) => p.name)).toEqual(["C"]);
    expect(r.errors).toHaveLength(3);
  });

  it("rejects duplicate barcodes and missing headers", () => {
    expect(parseInventoryCsv("name,price,barcode\nA,1,9\nB,1,9").errors).toHaveLength(1);
    expect(parseInventoryCsv("foo,bar\n1,2").errors[0]).toMatch(/name and price/);
  });
});
