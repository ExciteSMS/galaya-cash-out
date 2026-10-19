// Shared gateway status checks, used by verify-payment-style polling and reconcile-payments.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const MONEYUNIFY_VERIFY_API = "https://api.moneyunify.one/payments/verify";
const LIPILA_STATUS_API = "https://blz.lipila.io/api/v1/collections/check-status";
const LENCO_STATUS_API = "https://api.lenco.co/access/v2/collection/status";

export type GatewayName = "lenco" | "lipila" | "moneyunify";
export type GatewayStatus = "success" | "failed" | "pending";

export interface GatewayCredentials {
  lenco?: string;
  lipila?: string;
  moneyunify?: string;
}

const SUCCESS = ["successful", "success", "completed", "paid"];
const FAILED = ["failed", "rejected", "cancelled", "canceled", "declined"];

export function classify(raw: unknown): GatewayStatus {
  const s = String(raw ?? "").toLowerCase();
  if (SUCCESS.includes(s)) return "success";
  if (FAILED.includes(s)) return "failed";
  return "pending";
}

export async function loadCredentials(): Promise<{ creds: GatewayCredentials; active: GatewayName | null }> {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await admin.from("app_settings").select("key, value").in("key", [
    "gateway_lipila_enabled", "gateway_moneyunify_enabled", "gateway_lenco_enabled",
    "lipila_api_key", "moneyunify_auth_id", "lenco_api_key",
  ]);
  const map: Record<string, string> = {};
  data?.forEach((s: { key: string; value: string }) => (map[s.key] = s.value));

  const creds: GatewayCredentials = {
    lenco: map.lenco_api_key || Deno.env.get("LENCO_API_KEY") || "",
    lipila: map.lipila_api_key || Deno.env.get("LIPILA_API_KEY") || "",
    moneyunify: map.moneyunify_auth_id || Deno.env.get("MONEYUNIFY_AUTH_ID") || "",
  };
  let active: GatewayName | null = null;
  if (map.gateway_lenco_enabled === "true" && creds.lenco) active = "lenco";
  else if (map.gateway_lipila_enabled !== "false" && creds.lipila) active = "lipila";
  else if (map.gateway_moneyunify_enabled === "true" && creds.moneyunify) active = "moneyunify";
  return { creds, active };
}

async function readJson(r: Response) {
  const raw = await r.text();
  try { return JSON.parse(raw); } catch { return { message: raw }; }
}

/** Asks the gateway for the current state of a collection. Returns "pending" on any doubt. */
export async function checkGatewayStatus(gateway: GatewayName, creds: GatewayCredentials, reference: string): Promise<GatewayStatus> {
  try {
    if (gateway === "lenco" && creds.lenco) {
      const r = await fetch(`${LENCO_STATUS_API}/${encodeURIComponent(reference)}`, {
        headers: { accept: "application/json", Authorization: `Bearer ${creds.lenco}` },
      });
      const d = await readJson(r);
      return classify(d?.data?.status || d?.status);
    }
    if (gateway === "lipila" && creds.lipila) {
      const r = await fetch(`${LIPILA_STATUS_API}?referenceId=${encodeURIComponent(reference)}`, {
        headers: { accept: "application/json", "x-api-key": creds.lipila },
      });
      const d = await readJson(r);
      return classify(d?.status);
    }
    if (gateway === "moneyunify" && creds.moneyunify) {
      const r = await fetch(MONEYUNIFY_VERIFY_API, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams({ auth_id: creds.moneyunify, transaction_id: reference }).toString(),
      });
      const d = await readJson(r);
      return classify(d?.data?.status);
    }
  } catch (e) {
    console.error(`${gateway} status check error:`, e);
  }
  return "pending";
}
