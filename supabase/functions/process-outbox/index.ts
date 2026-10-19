import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 8;
const BATCH = 25;

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(url, serviceKey);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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

type Outcome = { ok: true; skipped?: boolean } | { ok: false; error: string };

const internalHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` };

async function deliverSms(payload: Record<string, unknown>): Promise<Outcome> {
  const res = await fetch(`${url}/functions/v1/send-sms`, {
    method: "POST", headers: internalHeaders, body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: `send-sms ${res.status}: ${body?.error ?? ""}` };
  if (body.sent === false) return { ok: true, skipped: true };
  const results = Object.values(body.results ?? {});
  if (results.length === 0) return { ok: true, skipped: true };
  if (results.some((r) => r === false)) return { ok: false, error: "SMS gateway rejected the message" };
  return { ok: true };
}

async function deliverZra(payload: Record<string, unknown>): Promise<Outcome> {
  const res = await fetch(`${url}/functions/v1/zra-invoice`, {
    method: "POST", headers: internalHeaders, body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (body?.skipped) return { ok: true, skipped: true };
  if (!res.ok || body?.success === false) return { ok: false, error: `zra-invoice ${res.status}: ${body?.error ?? ""}` };
  return { ok: true };
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function deliverWebhook(payload: Record<string, unknown>): Promise<Outcome> {
  const { data: hook } = await admin
    .from("merchant_webhooks").select("id, url, secret, is_active").eq("id", payload.webhook_id as string).maybeSingle();
  if (!hook || !hook.is_active) return { ok: true, skipped: true };
  if (!/^https:\/\//i.test(hook.url)) return { ok: false, error: "Webhook URL must use https" };

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify({ event: payload.event, data: payload.data, created: Number(timestamp) });
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Galaya-Event": String(payload.event),
    "X-Galaya-Timestamp": timestamp,
  };
  if (hook.secret) headers["X-Galaya-Signature"] = `sha256=${await hmacHex(hook.secret, `${timestamp}.${body}`)}`;

  let status = "error";
  let error = "";
  try {
    const res = await fetch(hook.url, { method: "POST", headers, body, redirect: "manual", signal: AbortSignal.timeout(10_000) });
    status = String(res.status);
    if (!res.ok) error = `Webhook responded ${res.status}`;
  } catch (e) {
    error = e instanceof Error ? e.message : "Webhook request failed";
  }
  await admin.from("merchant_webhooks")
    .update({ last_delivery_at: new Date().toISOString(), last_status: status }).eq("id", hook.id);
  return error ? { ok: false, error } : { ok: true };
}

// 1m, 2m, 4m ... capped at 1h
const backoffSeconds = (attempts: number) => Math.min(3600, 60 * 2 ** (attempts - 1));

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!(await authorised(req))) return json({ error: "Unauthorized" }, 401);

  const { data: rows, error } = await admin.rpc("claim_outbox", { p_limit: BATCH });
  if (error) return json({ error: error.message }, 500);

  const summary = { claimed: rows?.length ?? 0, sent: 0, skipped: 0, retried: 0, dead: 0 };

  for (const row of rows ?? []) {
    let outcome: Outcome;
    try {
      outcome = row.kind === "sms" ? await deliverSms(row.payload)
        : row.kind === "zra" ? await deliverZra(row.payload)
        : await deliverWebhook(row.payload);
    } catch (e) {
      outcome = { ok: false, error: e instanceof Error ? e.message : "Delivery failed" };
    }

    const attempts = row.attempts + 1;
    const now = new Date().toISOString();
    if (outcome.ok) {
      await admin.from("outbox").update({
        status: outcome.skipped ? "skipped" : "sent", attempts, last_error: null, updated_at: now,
      }).eq("id", row.id);
      if (outcome.skipped) summary.skipped++; else summary.sent++;
    } else if (attempts >= MAX_ATTEMPTS) {
      await admin.from("outbox").update({ status: "dead", attempts, last_error: outcome.error, updated_at: now }).eq("id", row.id);
      summary.dead++;
    } else {
      await admin.from("outbox").update({
        attempts, last_error: outcome.error,
        next_attempt_at: new Date(Date.now() + backoffSeconds(attempts) * 1000).toISOString(),
        updated_at: now,
      }).eq("id", row.id);
      summary.retried++;
    }
  }
  return json(summary);
});
