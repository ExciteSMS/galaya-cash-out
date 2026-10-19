import { describe, it, expect } from "vitest";
import { compareVersions, decideUpdate } from "@/lib/appUpdate";

const android = { version: "1.0.0", platform: "android" as const };

describe("appUpdate", () => {
  it("compares versions numerically", () => {
    expect(compareVersions("1.10.0", "1.9.0")).toBeGreaterThan(0);
    expect(compareVersions("1.0", "1.0.0")).toBe(0);
  });

  it("requires a store update below the minimum native version", () => {
    const info = { app_min_native_version: "1.1.0", app_store_url_android: "https://play" };
    expect(decideUpdate(info, android, "1.0.0")).toEqual({ type: "store", url: "https://play" });
    expect(decideUpdate(info, { ...android, version: "1.1.0" }, "1.0.0")).toEqual({ type: "none" });
  });

  it("downloads a newer web bundle only", () => {
    const info = { app_web_version: "1.2.0", app_web_bundle_url: "https://b.zip" };
    expect(decideUpdate(info, android, "1.1.0")).toEqual({ type: "ota", version: "1.2.0", url: "https://b.zip" });
    expect(decideUpdate(info, android, "1.2.0")).toEqual({ type: "none" });
    expect(decideUpdate(info, android, "1.3.0")).toEqual({ type: "none" });
    expect(decideUpdate({}, android, "1.0.0")).toEqual({ type: "none" });
  });
});
