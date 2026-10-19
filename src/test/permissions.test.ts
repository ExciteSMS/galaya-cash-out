import { describe, expect, it } from "vitest";
import { can, SETTINGS_PERMISSION } from "@/lib/permissions";

describe("permissions", () => {
  it("gives owners everything", () => {
    for (const p of ["owner", "manage", "inventory", "sell"] as const) expect(can("owner", p)).toBe(true);
  });
  it("keeps payout and staff control with the owner", () => {
    expect(can("manager", "owner")).toBe(false);
    expect(SETTINGS_PERMISSION.payout).toBe("owner");
    expect(SETTINGS_PERMISSION.staff).toBe("owner");
  });
  it("limits cashiers to selling", () => {
    expect(can("cashier", "sell")).toBe(true);
    expect(can("cashier", "inventory")).toBe(false);
    expect(can("cashier", "manage")).toBe(false);
  });
  it("makes viewers read-only and denies unknown roles", () => {
    expect(can("viewer", "sell")).toBe(false);
    expect(can(null, "sell")).toBe(false);
  });
});
