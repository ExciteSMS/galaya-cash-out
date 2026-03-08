/**
 * POS Hardware Printer Detection & Native Printing
 * Supports: Sunmi, PAX, Telpo, and generic Android WebView print bridges.
 */

declare global {
  interface Window {
    // Sunmi
    PrinterService?: {
      printerInit: () => void;
      printText: (text: string, callback?: any) => void;
      printBitmap: (bitmap: any, callback?: any) => void;
      lineWrap: (lines: number, callback?: any) => void;
      setFontSize: (size: number, callback?: any) => void;
      setAlignment: (align: number, callback?: any) => void;
      printColumnsText: (texts: string[], widths: number[], aligns: number[], callback?: any) => void;
      commitPrinterBuffer: () => void;
    };
    // PAX
    pax?: {
      printer: {
        init: () => void;
        printStr: (text: string, charset?: string) => void;
        step: (lines: number) => void;
        start: () => number;
        fontSet: (asciiFontType: number, cFontType: number) => void;
      };
    };
    // Telpo
    TelpoThermalPrinter?: {
      begin: () => void;
      write: (data: string) => void;
      end: () => void;
    };
    // Generic Android bridge
    AndroidPrinter?: {
      print: (html: string) => void;
    };
  }
}

export type PrinterType = "sunmi" | "pax" | "telpo" | "android_bridge" | "browser" | "none";

export interface PrinterInfo {
  detected: boolean;
  type: PrinterType;
  name: string;
}

/**
 * Detect available POS hardware printer
 */
export function detectPrinter(): PrinterInfo {
  // Sunmi devices
  if (window.PrinterService) {
    return { detected: true, type: "sunmi", name: "Sunmi Thermal Printer" };
  }

  // PAX devices
  if (window.pax?.printer) {
    return { detected: true, type: "pax", name: "PAX Thermal Printer" };
  }

  // Telpo devices
  if (window.TelpoThermalPrinter) {
    return { detected: true, type: "telpo", name: "Telpo Thermal Printer" };
  }

  // Generic Android WebView bridge
  if (window.AndroidPrinter) {
    return { detected: true, type: "android_bridge", name: "Android POS Printer" };
  }

  // Browser print (fallback)
  if (typeof window.print === "function") {
    return { detected: true, type: "browser", name: "Browser Print" };
  }

  return { detected: false, type: "none", name: "No printer detected" };
}

/**
 * Print formatted receipt text via native POS printer
 */
export function printViaNative(
  lines: { text: string; bold?: boolean; align?: "left" | "center" | "right"; size?: "sm" | "md" | "lg" }[]
): boolean {
  const printer = detectPrinter();

  if (printer.type === "sunmi" && window.PrinterService) {
    try {
      const ps = window.PrinterService;
      ps.printerInit();
      for (const line of lines) {
        ps.setAlignment(line.align === "center" ? 1 : line.align === "right" ? 2 : 0);
        ps.setFontSize(line.size === "lg" ? 32 : line.size === "sm" ? 20 : 24);
        ps.printText(line.text + "\n");
      }
      ps.lineWrap(4);
      ps.commitPrinterBuffer();
      return true;
    } catch (e) {
      console.error("Sunmi print error:", e);
      return false;
    }
  }

  if (printer.type === "pax" && window.pax?.printer) {
    try {
      const pp = window.pax.printer;
      pp.init();
      for (const line of lines) {
        pp.fontSet(
          line.size === "lg" ? 2 : line.size === "sm" ? 0 : 1,
          line.size === "lg" ? 2 : line.size === "sm" ? 0 : 1
        );
        pp.printStr(line.text + "\n", "UTF-8");
      }
      pp.step(80);
      pp.start();
      return true;
    } catch (e) {
      console.error("PAX print error:", e);
      return false;
    }
  }

  if (printer.type === "telpo" && window.TelpoThermalPrinter) {
    try {
      const tp = window.TelpoThermalPrinter;
      tp.begin();
      for (const line of lines) {
        tp.write(line.text + "\n");
      }
      tp.end();
      return true;
    } catch (e) {
      console.error("Telpo print error:", e);
      return false;
    }
  }

  return false;
}

/**
 * Build receipt lines from transaction data for native printing
 */
export function buildReceiptLines(transaction: {
  provider: string;
  phone: string;
  amount: number;
  fee: number;
  reference?: string | null;
  created_at: string;
}, merchantName?: string) {
  const date = new Date(transaction.created_at);
  const divider = "--------------------------------";

  return [
    { text: merchantName || "GALAYA", bold: true, align: "center" as const, size: "lg" as const },
    { text: "Payment Receipt", align: "center" as const, size: "sm" as const },
    { text: divider, align: "center" as const },
    { text: `Date: ${date.toLocaleDateString()}` },
    { text: `Time: ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` },
    { text: divider, align: "center" as const },
    { text: `Provider: ${transaction.provider} Money` },
    { text: `Customer: ${transaction.phone}` },
    { text: `Amount:  K${transaction.amount.toLocaleString()}` },
    { text: `Fee:     K${transaction.fee}` },
    { text: divider, align: "center" as const },
    { text: `TOTAL    K${transaction.amount.toLocaleString()}`, bold: true, size: "lg" as const },
    { text: divider, align: "center" as const },
    { text: `Ref: ${transaction.reference || "N/A"}`, size: "sm" as const },
    { text: `Status: ✓ PAID`, bold: true },
    { text: divider, align: "center" as const },
    { text: "Thank you for your payment!", align: "center" as const, size: "sm" as const },
    { text: "Powered by Galaya", align: "center" as const, size: "sm" as const },
  ];
}
