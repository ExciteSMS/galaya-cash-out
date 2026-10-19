import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXCITE_SMS_API = "https://gateway.excitesms.com/api/v3/sms/send";
const HARD_LOCK_AFTER = 10;
const HARD_LOCK_MINUTES = 15;
const OTP_TTL_MINUTES = 10;
const OTP_MAX_TRIES = 5;
const OTP_RESEND_SECONDS = 60;

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const phoneToEmail = (phone: string) => `${phone}@galaya.app`;
const pinToPassword = (pin: string) => `galaya_${pin}`;
const validPhone = (p: unknown): p is string => typeof p === "string" && /^\d{10}$/.test(p);
const validPin = (p: unknown): p is string => typeof p === "string" && /^\d{4}$/.test(p);

function intlPhone(phone: string) {
  return phone.startsWith("0") ? "260" + phone.slice(1) : phone;
}

async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomCode() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, "0");
}

async function getSettings() {
  const { data } = await admin.from("app_settings").select("key, value").in("key", [
    "otp_after_failed_logins",
    "otp_failed_login_threshold",
    "sms_enabled",
    "excite_sms_api_key",
    "excite_sms_sender_id",
  ]);
  const map: Record<string, string> = {};
  data?.forEach((s) => (map[s.key] = s.value));
  const threshold = parseInt(map.otp_failed_login_threshold || "4", 10);
  return {
    otpEnabled: map.otp_after_failed_logins === "true",
    threshold: Number.isFinite(threshold) && threshold > 0 ? threshold : 4,
    apiKey: map.excite_sms_api_key || "",
    senderId: map.excite_sms_sender_id || "Galaya",
  };
}

async function getAttempts(phone: string) {
  const { data } = await admin.from("login_attempts").select("*").eq("phone", phone).maybeSingle();
  return data ?? { phone, failed_count: 0, locked_until: null as string | null };
}

async function otpIsVerified(phone: string) {
  const { data } = await admin.from("login_otps").select("verified_until").eq("phone", phone).maybeSingle();
  return !!data?.verified_until && new Date(data.verified_until) > new Date();
}

async function sendSms(apiKey: string, senderId: string, phone: string, message: string) {
  try {
    const res = await fetch(EXCITE_SMS_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ recipient: intlPhone(phone), sender_id: senderId, type: "plain", message }),
    });
    return res.ok;
  } catch (e) {
    console.error("OTP SMS error:", e);
    return false;
  }
}

// Owners and staff both log in by phone; return the auth user id of whichever owns the number.
async function findLoginUserId(phone: string): Promise<string | null> {
  const { data: owner } = await admin.from("merchants").select("user_id").eq("phone_number", phone).maybeSingle();
  if (owner) return owner.user_id;
  const { data: staff } = await admin.from("merchant_staff").select("user_id").eq("phone", phone).maybeSingle();
  return staff?.user_id ?? null;
}

async function sendOtp(phone: string) {
  const cfg = await getSettings();
  // Answer the same way whether or not the number is registered, so numbers can't be enumerated.
  const merchant = await findLoginUserId(phone);
  const { data: existing } = await admin.from("login_otps").select("sent_at").eq("phone", phone).maybeSingle();
  if (existing && Date.now() - new Date(existing.sent_at).getTime() < OTP_RESEND_SECONDS * 1000) {
    return json({ error: "Please wait a minute before requesting another code", code: "rate_limited" }, 429);
  }
  if (!merchant) {
    await admin.from("login_otps").upsert({
      phone, code_hash: "-", expires_at: new Date().toISOString(), attempts: 0, verified_until: null, sent_at: new Date().toISOString(),
    });
    return json({ sent: true });
  }
  if (!cfg.apiKey) return json({ error: "SMS is not configured. Contact support.", code: "sms_unavailable" }, 503);

  const code = randomCode();
  const ok = await sendSms(cfg.apiKey, cfg.senderId, phone, `Your Galaya verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes. Never share it.`);
  if (!ok) return json({ error: "Could not send the code. Try again shortly.", code: "sms_failed" }, 502);

  await admin.from("login_otps").upsert({
    phone,
    code_hash: await sha256(`${phone}:${code}`),
    expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString(),
    attempts: 0,
    verified_until: null,
    sent_at: new Date().toISOString(),
  });
  return json({ sent: true });
}

// Returns null when the code is valid (and marks it as used), otherwise an error message.
async function checkOtp(phone: string, code: unknown): Promise<string | null> {
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) return "Enter the 6-digit code";
  const { data: row } = await admin.from("login_otps").select("*").eq("phone", phone).maybeSingle();
  if (!row || row.code_hash === "-" || new Date(row.expires_at) < new Date()) return "Code expired. Request a new one.";
  if (row.attempts >= OTP_MAX_TRIES) return "Too many wrong codes. Request a new one.";
  if (row.code_hash !== (await sha256(`${phone}:${code}`))) {
    await admin.from("login_otps").update({ attempts: row.attempts + 1 }).eq("phone", phone);
    return "Incorrect code";
  }
  await admin.from("login_otps").update({
    verified_until: new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString(),
    expires_at: new Date().toISOString(),
  }).eq("phone", phone);
  return null;
}

async function clearState(phone: string) {
  await admin.from("login_attempts").delete().eq("phone", phone);
  await admin.from("login_otps").delete().eq("phone", phone);
}

async function login(phone: string, pin: string, otp?: string) {
  const cfg = await getSettings();
  const attempts = await getAttempts(phone);

  if (attempts.locked_until && new Date(attempts.locked_until) > new Date()) {
    return json({ error: "Too many attempts. Try again in a few minutes.", code: "locked" }, 429);
  }

  const needsOtp = cfg.otpEnabled && attempts.failed_count >= cfg.threshold;
  if (needsOtp && !(await otpIsVerified(phone))) {
    if (!otp) return json({ error: "Verification code required", code: "otp_required" }, 403);
    const otpError = await checkOtp(phone, otp);
    if (otpError) return json({ error: otpError, code: "otp_invalid" }, 403);
  }

  const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anon.auth.signInWithPassword({ email: phoneToEmail(phone), password: pinToPassword(pin) });

  if (error || !data.session) {
    const failed = attempts.failed_count + 1;
    const lock = failed >= HARD_LOCK_AFTER;
    await admin.from("login_attempts").upsert({
      phone,
      failed_count: lock ? 0 : failed,
      last_failed_at: new Date().toISOString(),
      locked_until: lock ? new Date(Date.now() + HARD_LOCK_MINUTES * 60_000).toISOString() : null,
      updated_at: new Date().toISOString(),
    });
    const otpNow = cfg.otpEnabled && !lock && failed >= cfg.threshold;
    return json({ error: "Invalid phone or PIN", code: otpNow ? "otp_required" : lock ? "locked" : "invalid" }, 401);
  }

  await clearState(phone);
  return json({ session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } });
}

async function resetPin(phone: string, otp: string, newPin: string) {
  const otpError = await checkOtp(phone, otp);
  if (otpError) return json({ error: otpError, code: "otp_invalid" }, 403);
  const userId = await findLoginUserId(phone);
  if (!userId) return json({ error: "Could not reset PIN", code: "invalid" }, 400);
  const { error } = await admin.auth.admin.updateUserById(userId, { password: pinToPassword(newPin) });
  if (error) return json({ error: "Could not reset PIN" }, 500);
  await clearState(phone);
  return json({ reset: true });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    if (!validPhone(body.phone)) return json({ error: "Invalid phone number" }, 400);

    switch (body.action) {
      case "login":
        if (!validPin(body.pin)) return json({ error: "Invalid phone or PIN" }, 400);
        return await login(body.phone, body.pin, body.otp);
      case "send_otp":
        return await sendOtp(body.phone);
      case "reset_pin":
        if (!validPin(body.new_pin)) return json({ error: "PIN must be 4 digits" }, 400);
        return await resetPin(body.phone, String(body.otp ?? ""), body.new_pin);
      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (err) {
    console.error("auth-guard error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
