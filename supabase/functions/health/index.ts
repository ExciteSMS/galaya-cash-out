import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

// Public liveness probe: reports only coarse status, never internals.
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const started = Date.now();
  const [db, dead, stuck] = await Promise.all([
    admin.from("app_settings").select("key", { head: true, count: "exact" }).limit(1),
    admin.from("outbox").select("id", { head: true, count: "exact" }).eq("status", "dead"),
    admin.from("outbox").select("id", { head: true, count: "exact" }).eq("status", "pending")
      .lt("next_attempt_at", new Date(Date.now() - 15 * 60_000).toISOString()),
  ]);
  const checks = {
    database: !db.error,
    outbox_dead_letters: (dead.count ?? 0) === 0,
    outbox_not_stuck: (stuck.count ?? 0) === 0,
  };
  const ok = checks.database;
  const status = ok && Object.values(checks).every(Boolean) ? "ok" : ok ? "degraded" : "down";
  return new Response(JSON.stringify({ status, checks, ms: Date.now() - started }), {
    status: ok ? 200 : 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
