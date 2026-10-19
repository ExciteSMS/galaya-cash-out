// Device identification + binding helpers.
// A device gets a stable ID stored in localStorage. First device registered
// against an account becomes the "bound" device; later logins from a different
// device are rejected unless an admin releases the binding.
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";

const DEVICE_ID_KEY = "galaya_device_id";

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "d-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

let cachedDeviceId: string | null = null;

/** Hardware-backed ID on native apps (Android ID / iOS vendor ID); persistent localStorage ID on web. */
export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  if (typeof window === "undefined") return "server";
  if (Capacitor.isNativePlatform()) {
    try {
      const { identifier } = await Device.getId();
      if (identifier) {
        cachedDeviceId = `native-${identifier}`;
        return cachedDeviceId;
      }
    } catch {
      // fall through to the stored ID
    }
  }
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  cachedDeviceId = id;
  return id;
}

export function detectPlatform(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  // Capacitor native shell signals
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = (window as any).Capacitor;
  if (cap?.isNativePlatform?.()) return cap.getPlatform?.() ?? "native";
  if (/android/i.test(ua)) return "android-web";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios-web";
  if (/windows/i.test(ua)) return "windows";
  if (/mac/i.test(ua)) return "mac";
  if (/linux/i.test(ua)) return "linux";
  return "web";
}

export function detectDeviceName(): string {
  if (typeof navigator === "undefined") return "Unknown";
  const ua = navigator.userAgent;
  const m = ua.match(/\(([^)]+)\)/);
  return (m?.[1] || "Browser").slice(0, 80);
}

interface Telemetry {
  latitude: number | null;
  longitude: number | null;
  location_accuracy: number | null;
  location_updated_at: string | null;
  location_status: "ok" | "denied" | "unavailable";
  battery_level: number | null;
  is_charging: boolean | null;
  app_online: boolean;
}

function getPosition(): Promise<GeolocationPosition | "denied" | "unavailable"> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve("unavailable");
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      (err) => resolve(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  });
}

async function getBattery(): Promise<{ level: number | null; charging: boolean | null }> {
  try {
    if (Capacitor.isNativePlatform()) {
      const b = await Device.getBatteryInfo();
      return {
        level: b.batteryLevel != null ? Math.round(b.batteryLevel * 100) : null,
        charging: b.isCharging ?? null,
      };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (nav.getBattery) {
      const b = await nav.getBattery();
      return { level: Math.round(b.level * 100), charging: !!b.charging };
    }
  } catch {
    // battery info is best effort
  }
  return { level: null, charging: null };
}

async function collectTelemetry(): Promise<Telemetry> {
  const [pos, battery] = await Promise.all([getPosition(), getBattery()]);
  const located = typeof pos !== "string";
  return {
    latitude: located ? pos.coords.latitude : null,
    longitude: located ? pos.coords.longitude : null,
    location_accuracy: located ? pos.coords.accuracy : null,
    location_updated_at: located ? new Date().toISOString() : null,
    location_status: located ? "ok" : pos,
    battery_level: battery.level,
    is_charging: battery.charging,
    app_online: true,
  };
}

function baseFields(device_id: string) {
  return {
    device_id,
    device_name: detectDeviceName(),
    platform: detectPlatform(),
    user_agent: navigator.userAgent.slice(0, 500),
  };
}

/** Called on register. Binds the current device to the new account. */
export async function bindDeviceToUser(userId: string) {
  const device_id = await getDeviceId();
  const telemetry = await collectTelemetry();
  await supabase.from("user_devices").insert({
    user_id: userId,
    ...baseFields(device_id),
    ...telemetry,
    is_bound: true,
    is_active: true,
  });
}

/** Refreshes last_seen, location and battery for the bound device. Safe to call repeatedly. */
export async function sendDeviceHeartbeat(userId: string) {
  const device_id = await getDeviceId();
  const telemetry = await collectTelemetry();
  const update: Record<string, unknown> = { last_seen: new Date().toISOString(), app_online: true };
  // Keep the last known position when a fresh fix is unavailable.
  update.location_status = telemetry.location_status;
  update.battery_level = telemetry.battery_level;
  update.is_charging = telemetry.is_charging;
  if (telemetry.latitude != null) {
    update.latitude = telemetry.latitude;
    update.longitude = telemetry.longitude;
    update.location_accuracy = telemetry.location_accuracy;
    update.location_updated_at = telemetry.location_updated_at;
  }
  await supabase
    .from("user_devices")
    .update(update)
    .eq("user_id", userId)
    .eq("device_id", device_id)
    .eq("is_active", true);
}

/**
 * Called on login. Returns:
 *  - { ok: true } when this device is allowed
 *  - { ok: false, reason } when the account is bound to another device
 * A blocked attempt is recorded (unbound) so admins can see it.
 */
export async function verifyDeviceForUser(userId: string): Promise<{ ok: boolean; reason?: string }> {
  const device_id = await getDeviceId();

  const { data: devices, error } = await supabase
    .from("user_devices")
    .select("id, device_id, is_bound, is_active")
    .eq("user_id", userId);
  if (error) return { ok: false, reason: "Could not verify this device. Please try again." };

  const list = devices || [];
  const bound = list.find((d) => d.is_bound && d.is_active);
  const current = list.find((d) => d.device_id === device_id);
  const telemetry = await collectTelemetry();

  if (bound && bound.device_id !== device_id) {
    const now = new Date().toISOString();
    if (current) {
      await supabase.from("user_devices").update({ is_active: true, last_seen: now, ...telemetry }).eq("id", current.id);
    } else {
      await supabase.from("user_devices").insert({
        user_id: userId, ...baseFields(device_id), ...telemetry, is_bound: false, is_active: true,
      });
    }
    return {
      ok: false,
      reason: "This account is already linked to another device. Contact support to transfer.",
    };
  }

  if (bound) {
    await sendDeviceHeartbeat(userId);
    return { ok: true };
  }

  // No active binding (new account or released by admin) → bind this device.
  const { error: bindError } = current
    ? await supabase
        .from("user_devices")
        .update({ is_bound: true, is_active: true, last_seen: new Date().toISOString(), ...telemetry })
        .eq("id", current.id)
    : await supabase.from("user_devices").insert({
        user_id: userId, ...baseFields(device_id), ...telemetry, is_bound: true, is_active: true,
      });
  if (bindError) return { ok: false, reason: "Could not bind this device. Please try again." };
  return { ok: true };
}
