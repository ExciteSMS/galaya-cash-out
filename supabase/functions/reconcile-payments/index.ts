import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { checkGatewayStatus, loadCredentials, type GatewayName } from "../_shared/gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_AGE_MINUTES = 2;
const MAX_AGE_DAYS = 7;
const STALE_HOURS = 24;
const BATCH = 50;

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(url, serviceKey);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Allowed callers: the scheduler (?token=callback_secret), the service role, or an admin user.
async function authorised(req: Request): Promise<boolean> {
  const bearer = (req.headers.get("authorization") || "").replace("Bearer ", "");
  if (bearer && bearer === serviceKey) return true;

  const token = new URL(req.url).searchParams.get("token") || "";
  if (token) {
    const { data } = await admin.from("app_settings").select("value").eq("key", "callback_secret").maybeSingle();
    if (data?.value && data.value === token) return true;
  }

  if (bearer) {
    const { data: u } = await admin.auth.getUser(bearer);
    if (u?.user) {
      const { data: role } = await admin
        .from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
      if (role) return true;
    }
  }
  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!(await authorised(req))) return json({ error: "Unauthorized" }, 401);

    const now = Date.now();
    const { data: pending, error } = await admin
      .from("transactions")
      .select("id, reference, gateway, created_at")
      .eq("status", "pending")
      .lt("created_at", new Date(now - MIN_AGE_MINUTES * 60_000).toISOString())
      .gt("created_at", new Date(now - MAX_AGE_DAYS * 86_400_000).toISOString())
      .order("created_at", { ascending: true })
      .limit(BATCH);
    if (error) throw error;

    const { creds, active } = await loadCredentials();
    const summary = { checked: 0, succeeded: 0, failed: 0, still_pending: 0, stale: 0 };

    for (const tx of pending ?? []) {
      summary.checked++;
      const gateway = (tx.gateway as GatewayName | null) ?? active;
      let status: "success" | "failed" | "pending" = "pending";
      if (gateway && tx.reference) status = await checkGatewayStatus(gateway, creds, tx.reference);

      if (status === "pending") {
        summary.still_pending++;
        if (now - new Date(tx.created_at).getTime() > STALE_HOURS * 3_600_000) summary.stale++;
        await admin.rpc("touch_reconcile", { p_id: tx.id });
        continue;
      }

      // Only the call that flips pending -> final runs side effects, so callbacks and retries can't double-notify.
      const { data: flipped } = await admin
        .from("transactions")
        .update({ status, reconciled_at: new Date().toISOString() })
        .eq("id", tx.id)
        .eq("status", "pending")
        .select("id");
      if (flipped && flipped.length > 0) {
        if (status === "success") {
          summary.succeeded++;
        } else {
          summary.failed++;
        }
      }
    }

    return json(summary);
  } catch (err) {
    console.error("reconcile-payments error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
