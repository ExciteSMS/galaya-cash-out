import { describe, expect, it } from "vitest";
import { isLocale, translate } from "@/lib/i18n";

describe("i18n", () => {
  it("translates and falls back to English", () => {
    expect(translate("en", "nav.home")).toBe("Home");
    expect(translate("ny", "nav.home")).not.toBe("Home");
  });
  it("validates stored locale values", () => {
    expect(isLocale("bem")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});
