import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { supabase } from "@/integrations/supabase/client";
import { decideUpdate, type AppUpdateInfo } from "./appUpdate";

declare const __APP_VERSION__: string;

export type StoreUpdate = { url: string } | null;

/**
 * Native apps only. Downloads new web bundles in the background and applies them on the
 * next app start (never mid-sale). Returns a store URL when the installed app is too old.
 */
export async function checkForAppUpdate(): Promise<StoreUpdate> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    await CapacitorUpdater.notifyAppReady();
    const { data } = await supabase.rpc("get_app_update_info");
    if (!data) return null;

    const [native, current] = await Promise.all([App.getInfo(), CapacitorUpdater.current()]);
    const web = current.bundle.version === "builtin" ? __APP_VERSION__ : current.bundle.version;
    const platform = Capacitor.getPlatform() === "ios" ? "ios" : "android";
    const action = decideUpdate(data as AppUpdateInfo, { version: native.version, platform }, web);

    if (action.type === "store") return { url: action.url };
    if (action.type === "ota") {
      const bundle = await CapacitorUpdater.download({ url: action.url, version: action.version });
      await CapacitorUpdater.next(bundle);
    }
  } catch (e) {
    console.warn("update check failed", e);
  }
  return null;
}
