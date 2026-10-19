export interface AppUpdateInfo {
  app_web_version?: string;
  app_web_bundle_url?: string;
  app_min_native_version?: string;
  app_store_url_android?: string;
  app_store_url_ios?: string;
}

export type UpdateAction =
  | { type: "none" }
  | { type: "store"; url: string }
  | { type: "ota"; version: string; url: string };

/** Returns <0, 0 or >0. Missing parts count as 0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/**
 * A store update wins: an app older than the minimum native version cannot run newer web
 * code safely. Otherwise a different published web version triggers an OTA download.
 */
export function decideUpdate(
  info: AppUpdateInfo,
  native: { version: string; platform: "android" | "ios" },
  currentWebVersion: string
): UpdateAction {
  const min = info.app_min_native_version;
  const storeUrl = native.platform === "ios" ? info.app_store_url_ios : info.app_store_url_android;
  if (min && storeUrl && compareVersions(native.version, min) < 0) return { type: "store", url: storeUrl };

  const web = info.app_web_version;
  const url = info.app_web_bundle_url;
  if (web && url && web !== currentWebVersion && compareVersions(web, currentWebVersion) > 0) {
    return { type: "ota", version: web, url };
  }
  return { type: "none" };
}
