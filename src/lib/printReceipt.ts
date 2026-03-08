import { Transaction } from "@/lib/api";
import { detectPrinter, printViaNative, buildReceiptLines } from "@/lib/posPrinter";

/**
 * Generates a receipt HTML optimized for Android POS thermal printers (58mm / 80mm).
 */
function buildReceiptHTML(transaction: Transaction, merchantName?: string): string {
  const { provider, phone, amount, fee, reference, created_at } = transaction;
  const date = new Date(created_at);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Receipt</title>
<style>
  @page { margin: 0; size: 58mm auto; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px; line-height: 1.4;
    width: 48mm; max-width: 48mm; padding: 4mm 2mm;
    color: #000; -webkit-print-color-adjust: exact;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .divider { border-top: 1px dashed #000; margin: 4px 0; }
  .row { display: flex; justify-content: space-between; padding: 1px 0; }
  .row .label { color: #333; }
  .row .value { font-weight: bold; text-align: right; }
  .total-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 14px; font-weight: bold; }
  .footer { text-align: center; font-size: 10px; color: #666; margin-top: 6px; }
  .logo { font-size: 16px; font-weight: bold; letter-spacing: 2px; }
  .sub { font-size: 9px; color: #666; }
</style>
</head>
<body>
  <div class="center">
    <div class="logo">${merchantName || "GALAYA"}</div>
    <div class="sub">Payment Receipt</div>
  </div>
  <div class="divider"></div>
  <div class="row"><span class="label">Date:</span><span class="value">${date.toLocaleDateString()}</span></div>
  <div class="row"><span class="label">Time:</span><span class="value">${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
  <div class="divider"></div>
  <div class="row"><span class="label">Provider:</span><span class="value">${provider} Money</span></div>
  <div class="row"><span class="label">Customer:</span><span class="value">${phone}</span></div>
  <div class="row"><span class="label">Amount:</span><span class="value">K${amount.toLocaleString()}</span></div>
  <div class="row"><span class="label">Fee:</span><span class="value">K${fee}</span></div>
  <div class="divider"></div>
  <div class="total-row"><span>TOTAL</span><span>K${amount.toLocaleString()}</span></div>
  <div class="divider"></div>
  <div class="row"><span class="label">Ref:</span><span class="value" style="font-size:10px;">${reference || "N/A"}</span></div>
  <div class="row"><span class="label">Status:</span><span class="value">✓ PAID</span></div>
  <div class="divider"></div>
  <div class="footer">
    <p>Thank you for your payment!</p>
    <p>Powered by Galaya</p>
  </div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</script>
</body>
</html>`;
}

/**
 * Smart print — tries native POS hardware first, falls back to browser print.
 */
export function printReceipt(transaction: Transaction, merchantName?: string): void {
  const printer = detectPrinter();

  // Try native hardware first (Sunmi, PAX, Telpo)
  if (printer.type !== "browser" && printer.type !== "none") {
    const lines = buildReceiptLines(transaction, merchantName);
    const success = printViaNative(lines);
    if (success) return;
  }

  // Fallback to browser print via popup
  const html = buildReceiptHTML(transaction, merchantName);
  const printWindow = window.open("", "_blank", "width=300,height=600");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

/**
 * Smart inline print — tries native POS hardware first, falls back to iframe print.
 */
export function printReceiptInline(transaction: Transaction, merchantName?: string): void {
  const printer = detectPrinter();

  // Try native hardware first
  if (printer.type !== "browser" && printer.type !== "none") {
    const lines = buildReceiptLines(transaction, merchantName);
    const success = printViaNative(lines);
    if (success) return;
  }

  // Fallback to iframe print
  const html = buildReceiptHTML(transaction, merchantName);
  const existing = document.getElementById("pos-print-frame");
  if (existing) existing.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "pos-print-frame";
  iframe.style.position = "fixed";
  iframe.style.top = "-10000px";
  iframe.style.left = "-10000px";
  iframe.style.width = "58mm";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 2000);
    }, 500);
  }
}

/**
 * Get info about the detected printer for UI display.
 */
export { detectPrinter } from "@/lib/posPrinter";

