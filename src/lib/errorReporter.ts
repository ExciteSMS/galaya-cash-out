import { supabase } from "@/integrations/supabase/client";

const recent = new Map<string, number>();
const DEDUPE_MS = 60_000;
const MAX_PER_SESSION = 20;
let sent = 0;

export async function reportError(error: unknown) {
  const err = error instanceof Error ? error : new Error(String(error));
  const key = err.message;
  const now = Date.now();
  if (sent >= MAX_PER_SESSION || now - (recent.get(key) ?? 0) < DEDUPE_MS) return;
  recent.set(key, now);
  sent++;
  try {
    await supabase.from("client_errors").insert({
      message: err.message.slice(0, 1000),
      stack: err.stack?.slice(0, 4000) ?? null,
      url: window.location.pathname.slice(0, 500),
    });
  } catch {
    // reporting must never throw
  }
}

export function installErrorReporter() {
  window.addEventListener("error", (e) => reportError(e.error ?? e.message));
  window.addEventListener("unhandledrejection", (e) => reportError(e.reason));
}
