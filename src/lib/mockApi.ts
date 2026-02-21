export type Provider = "MTN" | "Zamtel" | "Airtel";

export interface Transaction {
  id: string;
  provider: Provider;
  phone: string;
  amount: number;
  fee: number;
  status: "pending" | "success" | "failed";
  timestamp: Date;
  reference: string;
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

export async function processPayment(
  provider: Provider,
  phone: string,
  amount: number,
  pin: string
): Promise<Transaction> {
  // Simulate API call
  await new Promise((r) => setTimeout(r, 2500));

  if (pin !== "1234") {
    throw new Error("Invalid PIN. Please try again.");
  }

  const fee = calculateFee(amount);

  return {
    id: crypto.randomUUID(),
    provider,
    phone,
    amount,
    fee,
    status: "success",
    timestamp: new Date(),
    reference: generateRef(),
  };
}

export const MOCK_BALANCE = 15420.5;

export const PRESET_AMOUNTS = [50, 100, 200, 500, 1000, 2000];
