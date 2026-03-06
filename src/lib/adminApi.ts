import { supabase } from "@/integrations/supabase/client";

export interface AppSetting {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}

export async function getSettings(): Promise<AppSetting[]> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .order("key");
  if (error) throw new Error(error.message);
  return data || [];
}

export async function updateSetting(key: string, value: string): Promise<void> {
  const { error } = await supabase
    .from("app_settings")
    .update({ value, updated_at: new Date().toISOString() })
    .eq("key", key);
  if (error) throw new Error(error.message);
}

export async function upsertSetting(key: string, value: string): Promise<void> {
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

export async function getAllMerchants() {
  const { data, error } = await supabase
    .from("merchants")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getAllTransactions() {
  const { data, error } = await supabase
    .from("transactions")
    .select("*, merchants(name, phone_number)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getAllDisbursements() {
  const { data, error } = await supabase
    .from("disbursements")
    .select("*, merchants(name, phone_number)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getPublicSettings(): Promise<Record<string, string>> {
  // For merchant-side: read withdrawal fee settings via edge function or public access
  // Since app_settings is admin-only, we use a simple fallback approach
  const defaults: Record<string, string> = {
    withdrawal_platform_fee_pct: "1",
    withdrawal_gateway_fee_pct: "3.5",
  };
  
  try {
    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["withdrawal_platform_fee_pct", "withdrawal_gateway_fee_pct"]);
    if (data) {
      data.forEach((s) => (defaults[s.key] = s.value));
    }
  } catch {
    // Fall back to defaults if RLS blocks
  }
  
  return defaults;
}
