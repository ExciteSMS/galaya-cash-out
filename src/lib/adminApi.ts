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
