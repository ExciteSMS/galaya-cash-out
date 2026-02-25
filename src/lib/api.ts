import { supabase } from "@/integrations/supabase/client";

export type Provider = "MTN" | "Zamtel" | "Airtel";

export interface Transaction {
  id: string;
  provider: string;
  phone: string;
  amount: number;
  fee: number;
  status: string;
  reference: string | null;
  created_at: string;
  merchant_id: string;
}

const PROVIDER_PREFIXES: Record<Provider, string[]> = {
  MTN: ["096", "076"],
  Zamtel: ["095", "075"],
  Airtel: ["097", "077"],
};

export function detectProvider(phone: string): Provider | null {
  const prefix = phone.substring(0, 3);
  for (const [provider, prefixes] of Object.entries(PROVIDER_PREFIXES)) {
    if (prefixes.includes(prefix)) return provider as Provider;
  }
  return null;
}

export function validatePhone(phone: string): boolean {
  return /^0[79][567]\d{7}$/.test(phone);
}

export function calculateFee(amount: number): number {
  if (amount <= 50) return 1;
  if (amount <= 200) return 3;
  if (amount <= 500) return 5;
  if (amount <= 1000) return 8;
  return 10;
}

function generateRef(): string {
  return "GAL" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
}

export const PRESET_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

export async function processPayment(
  merchantId: string,
  provider: Provider,
  phone: string,
  amount: number
): Promise<{ transaction: Transaction; success: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke("process-payment", {
    body: { provider, phone, amount },
  });

  if (error) throw new Error(error.message);
  if (!data.success) {
    return { transaction: data.transaction, success: false, error: data.error };
  }
  return { transaction: data.transaction, success: true };
}

export async function getTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}
