export interface DeviceHealthInput {
  is_bound: boolean;
  last_seen: string;
  location_status: string | null;
  battery_level: number | null;
  is_charging: boolean | null;
  latitude: number | null;
}

export const STALE_MS = 24 * 60 * 60 * 1000;
export const LOW_BATTERY_PERCENT = 15;

// A bound device is faulty when it has gone silent, can't report location, or is nearly dead.
export function deviceFaults(r: DeviceHealthInput, now = Date.now()): string[] {
  if (!r.is_bound) return [];
  const faults: string[] = [];
  if (now - new Date(r.last_seen).getTime() > STALE_MS) faults.push("No heartbeat for 24h+");
  if (r.location_status === "denied") faults.push("Location permission denied");
  else if (r.location_status === "unavailable" || r.latitude == null) faults.push("Location unavailable");
  if (r.battery_level != null && r.battery_level < LOW_BATTERY_PERCENT && !r.is_charging) {
    faults.push(`Low battery (${r.battery_level}%)`);
  }
  return faults;
}
