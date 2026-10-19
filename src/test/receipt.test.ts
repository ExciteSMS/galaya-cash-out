import { describe, expect, it } from "vitest";
import { buildReceiptText, toInternationalZm, whatsappLink } from "@/lib/receipt";

describe("receipt helpers", () => {
  it("converts Zambian numbers", () => {
    expect(toInternationalZm("0971234567")).toBe("260971234567");
    expect(toInternationalZm("260971234567")).toBe("260971234567");
    expect(toInternationalZm("12345")).toBeNull();
  });
  it("builds an encoded WhatsApp link", () => {
    const link = whatsappLink("0971234567", "Paid K5\nRef 1");
    expect(link).toBe("https://wa.me/260971234567?text=Paid%20K5%0ARef%201");
    expect(whatsappLink("abc", "x")).toBeNull();
  });
  it("includes amount and reference in the text", () => {
    const text = buildReceiptText("Shop", { provider: "MTN", phone: "0971234567", amount: 50, fee: 1, reference: "R1", created_at: "2026-01-01T00:00:00Z" });
    expect(text).toContain("Amount: K50");
    expect(text).toContain("Ref: R1");
    expect(text).toContain("Shop");
  });
});
