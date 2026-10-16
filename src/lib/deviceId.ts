// Device identification + binding helpers.
// A device gets a stable ID stored in localStorage. First device registered
// against an account becomes the "bound" device; later logins from a different
// device are rejected unless an admin releases the binding.
import { supabase } from "@/integrations/supabase/client";

const DEVICE_ID_KEY = "galaya_device_id";

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "d-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
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

/** Called on register. Binds the current device to the new account. */
export async function bindDeviceToUser(userId: string) {
  const device_id = getDeviceId();
  await supabase.from("user_devices").insert({
    user_id: userId,
    device_id,
    device_name: detectDeviceName(),
    platform: detectPlatform(),
    user_agent: navigator.userAgent.slice(0, 500),
    is_bound: true,
    is_active: true,
  });
}

/**
 * Called on login. Returns:
 *  - { ok: true } when this device is allowed
 *  - { ok: false, reason } when the account is bound to another device
 */
export async function verifyDeviceForUser(userId: string): Promise<{ ok: boolean; reason?: string }> {
  const device_id = getDeviceId();

  const { data: devices } = await supabase
    .from("user_devices")
    .select("id, device_id, is_bound, is_active")
    .eq("user_id", userId);

  const list = devices || [];
  const bound = list.find((d) => d.is_bound && d.is_active);
  const current = list.find((d) => d.device_id === device_id);

  // No binding yet → bind this device.
  if (!bound) {
    if (current) {
      await supabase
        .from("user_devices")
        .update({ is_bound: true, is_active: true, last_seen: new Date().toISOString() })
        .eq("id", current.id);
    } else {
      await supabase.from("user_devices").insert({
        user_id: userId,
        device_id,
        device_name: detectDeviceName(),
        platform: detectPlatform(),
        user_agent: navigator.userAgent.slice(0, 500),
        is_bound: true,
        is_active: true,
      });
    }
    return { ok: true };
  }

  // A different device is bound → reject.
  if (bound.device_id !== device_id) {
    return {
      ok: false,
      reason: "This account is already linked to another device. Contact support to transfer.",
    };
  }

  // Same device, refresh last_seen.
  if (current) {
    await supabase
      .from("user_devices")
      .update({ last_seen: new Date().toISOString(), is_active: true })
      .eq("id", current.id);
  }
  return { ok: true };
}
