import { supabase } from "@/integrations/supabase/client";

export type GuardCode = "otp_required" | "otp_invalid" | "locked" | "rate_limited" | "sms_unavailable" | "sms_failed" | "invalid";

export interface GuardResult {
  ok: boolean;
  error?: string;
  code?: GuardCode;
}

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("auth-guard", { body });
  if (error) {
    // Non-2xx responses carry the JSON body on error.context
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = (error as any).context;
    try {
      const parsed = ctx && typeof ctx.json === "function" ? await ctx.json() : null;
      if (parsed) return { data: parsed as Record<string, any>, failed: true };
    } catch {
      // ignore body parse errors
    }
    return { data: { error: "Network error. Please try again." } as Record<string, any>, failed: true };
  }
  return { data: (data ?? {}) as Record<string, any>, failed: false };
}

export async function guardedLogin(phone: string, pin: string, otp?: string): Promise<GuardResult> {
  const { data, failed } = await call({ action: "login", phone, pin, otp });
  if (failed || !data.session) return { ok: false, error: data.error ?? "Invalid phone or PIN", code: data.code };
  const { error } = await supabase.auth.setSession(data.session);
  if (error) return { ok: false, error: "Could not start session" };
  return { ok: true };
}

export async function requestOtp(phone: string): Promise<GuardResult> {
  const { data, failed } = await call({ action: "send_otp", phone });
  return failed ? { ok: false, error: data.error, code: data.code } : { ok: true };
}

export async function resetPin(phone: string, otp: string, newPin: string): Promise<GuardResult> {
  const { data, failed } = await call({ action: "reset_pin", phone, otp, new_pin: newPin });
  return failed ? { ok: false, error: data.error, code: data.code } : { ok: true };
}
