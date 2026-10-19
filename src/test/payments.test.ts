import { describe, it, expect, vi, beforeEach } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));

import { processPayment, newIdempotencyKey, calculateFee, detectProvider, validatePhone } from "@/lib/api";

describe("payments", () => {
  beforeEach(() => invoke.mockReset());

  it("generates unique idempotency keys", () => {
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey());
  });

  it("sends the idempotency key with the charge", async () => {
    invoke.mockResolvedValue({ data: { success: true }, error: null });
    await processPayment("m1", "MTN", "0961234567", 100, "key-1");
    expect(invoke).toHaveBeenCalledWith("process-payment", {
      body: { provider: "MTN", phone: "0961234567", amount: 100, idempotency_key: "key-1" },
    });
  });

  it("throws when the function errors", async () => {
    invoke.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(processPayment("m1", "MTN", "0961234567", 100)).rejects.toThrow("boom");
  });

  it("detects providers and validates phones", () => {
    expect(validatePhone("0961234567")).toBe(true);
    expect(validatePhone("123")).toBe(false);
    expect(detectProvider("0961234567")).toBeTruthy();
    expect(calculateFee(100)).toBeGreaterThanOrEqual(0);
  });
});
