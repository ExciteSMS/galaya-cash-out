import { describe, it, expect, vi, beforeEach } from "vitest";

const { invoke, setSession } = vi.hoisted(() => ({ invoke: vi.fn(), setSession: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke }, auth: { setSession } },
}));

import { guardedLogin, requestOtp, resetPin } from "@/lib/authGuard";

const failure = (body: unknown) => ({ data: null, error: { context: { json: async () => body } } });

describe("authGuard", () => {
  beforeEach(() => { invoke.mockReset(); setSession.mockReset(); });

  it("starts a session on success", async () => {
    invoke.mockResolvedValue({ data: { session: { access_token: "a" } }, error: null });
    setSession.mockResolvedValue({ error: null });
    expect(await guardedLogin("0961234567", "1234")).toEqual({ ok: true });
    expect(setSession).toHaveBeenCalled();
  });

  it("surfaces lockout and otp codes", async () => {
    invoke.mockResolvedValue(failure({ error: "Locked", code: "locked" }));
    expect(await guardedLogin("0961234567", "0000")).toMatchObject({ ok: false, code: "locked" });
    invoke.mockResolvedValue(failure({ error: "OTP", code: "otp_required" }));
    expect(await guardedLogin("0961234567", "0000")).toMatchObject({ ok: false, code: "otp_required" });
    expect(setSession).not.toHaveBeenCalled();
  });

  it("handles unparseable errors as network errors", async () => {
    invoke.mockResolvedValue({ data: null, error: {} });
    const r = await guardedLogin("0961234567", "1234");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/network/i);
  });

  it("requests otp and resets pin", async () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    expect((await requestOtp("0961234567")).ok).toBe(true);
    expect((await resetPin("0961234567", "123456", "4321")).ok).toBe(true);
    expect(invoke).toHaveBeenLastCalledWith("auth-guard", {
      body: { action: "reset_pin", phone: "0961234567", otp: "123456", new_pin: "4321" },
    });
    invoke.mockResolvedValue(failure({ error: "bad", code: "otp_invalid" }));
    expect(await resetPin("0961234567", "x", "4321")).toMatchObject({ ok: false, code: "otp_invalid" });
  });
});
