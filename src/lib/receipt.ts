export interface ReceiptData {
  provider: string;
  phone: string;
  amount: number;
  fee: number;
  reference: string | null;
  created_at: string;
}

export function buildReceiptText(merchantName: string | undefined, tx: ReceiptData): string {
  return [
    `--- ${merchantName || "GALAPESA"} ---`,
    `Payment Receipt`,
    ``,
    `Date: ${new Date(tx.created_at).toLocaleString()}`,
    `Provider: ${tx.provider} Money`,
    `Customer: ${tx.phone}`,
    `Amount: K${tx.amount.toLocaleString()}`,
    `Fee: K${tx.fee}`,
    `Total: K${tx.amount.toLocaleString()}`,
    `Ref: ${tx.reference || "N/A"}`,
    `Status: PAID ✓`,
    ``,
    `Powered by GalaPesa`,
  ].join("\n");
}

// 0971234567 -> 260971234567; returns null for anything that is not a local 10-digit number.
export function toInternationalZm(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (/^0\d{9}$/.test(digits)) return `260${digits.slice(1)}`;
  if (/^260\d{9}$/.test(digits)) return digits;
  return null;
}

export function whatsappLink(phone: string, text: string): string | null {
  const intl = toInternationalZm(phone);
  return intl ? `https://wa.me/${intl}?text=${encodeURIComponent(text)}` : null;
}
