export interface ProductRow {
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  stock_qty: number;
  low_stock_threshold: number;
}

export interface CsvParseResult {
  rows: ProductRow[];
  errors: string[];
}

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { out.push(cur.trim()); cur = ""; }
    else cur += c;
  }
  out.push(cur.trim());
  return out;
}

export function parseInventoryCsv(text: string): CsvParseResult {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  const errors: string[] = [];
  if (lines.length < 2) return { rows: [], errors: ["File needs a header row and at least one product"] };

  const header = splitLine(lines[0]).map((h) => h.toLowerCase().replace(/[\s-]+/g, "_"));
  const col = (...names: string[]) => header.findIndex((h) => names.includes(h));
  const iName = col("name", "product", "product_name");
  const iPrice = col("price");
  const iSku = col("sku");
  const iBarcode = col("barcode");
  const iStock = col("stock", "stock_qty", "quantity", "qty");
  const iLow = col("low_stock_threshold", "low_stock", "threshold");
  if (iName < 0 || iPrice < 0) return { rows: [], errors: ["Header must include name and price columns"] };

  const rows: ProductRow[] = [];
  const seen = new Set<string>();
  lines.slice(1).forEach((line, idx) => {
    const n = idx + 2;
    const c = splitLine(line);
    const name = c[iName] ?? "";
    const price = Number(c[iPrice]);
    const stock = iStock >= 0 && c[iStock] ? Number(c[iStock]) : 0;
    const low = iLow >= 0 && c[iLow] ? Number(c[iLow]) : 5;
    if (!name) return errors.push(`Row ${n}: name is missing`);
    if (!Number.isFinite(price) || price < 0) return errors.push(`Row ${n}: invalid price`);
    if (!Number.isInteger(stock) || stock < 0) return errors.push(`Row ${n}: invalid stock`);
    if (!Number.isInteger(low) || low < 0) return errors.push(`Row ${n}: invalid low stock threshold`);
    const barcode = (iBarcode >= 0 && c[iBarcode]) || null;
    if (barcode) {
      if (seen.has(barcode)) return errors.push(`Row ${n}: duplicate barcode ${barcode}`);
      seen.add(barcode);
    }
    rows.push({ name, sku: (iSku >= 0 && c[iSku]) || null, barcode, price, stock_qty: stock, low_stock_threshold: low });
  });
  return { rows, errors };
}
