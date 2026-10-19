import { describe, it, expect } from "vitest";
import { deviceFaults } from "@/lib/deviceHealth";

const now = new Date("2026-01-02T12:00:00Z").getTime();
const base = {
  is_bound: true,
  last_seen: "2026-01-02T11:00:00Z",
  location_status: "ok",
  battery_level: 80,
  is_charging: false,
  latitude: -15.4,
};

describe("deviceFaults", () => {
  it("reports a healthy bound device as fault free", () => {
    expect(deviceFaults(base, now)).toEqual([]);
  });

  it("ignores devices that are not bound", () => {
    expect(deviceFaults({ ...base, is_bound: false, location_status: "denied" }, now)).toEqual([]);
  });

  it("flags a silent device", () => {
    expect(deviceFaults({ ...base, last_seen: "2026-01-01T10:00:00Z" }, now)).toContain("No heartbeat for 24h+");
  });

  it("flags denied and missing location separately", () => {
    expect(deviceFaults({ ...base, location_status: "denied", latitude: null }, now)).toEqual(["Location permission denied"]);
    expect(deviceFaults({ ...base, latitude: null }, now)).toEqual(["Location unavailable"]);
  });

  it("flags low battery only when not charging", () => {
    expect(deviceFaults({ ...base, battery_level: 10 }, now)).toEqual(["Low battery (10%)"]);
    expect(deviceFaults({ ...base, battery_level: 10, is_charging: true }, now)).toEqual([]);
  });
});
