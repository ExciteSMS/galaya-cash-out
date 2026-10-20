import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { Button } from "@/components/ui/button";
import { checkForAppUpdate, type StoreUpdate } from "@/lib/appUpdateRuntime";

/** Blocks the app when the installed native version is older than the admin-set minimum. */
export default function UpdateGate() {
  const [update, setUpdate] = useState<StoreUpdate>(null);

  useEffect(() => {
    checkForAppUpdate().then(setUpdate);
    const sub = App.addListener("resume", () => checkForAppUpdate().then(setUpdate));
    return () => { sub.then((s) => s.remove()).catch(() => undefined); };
  }, []);

  if (!update) return null;
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <h1 className="text-xl font-semibold">Update required</h1>
      <p className="text-muted-foreground">A new version of GalaPesa is available. Please update to continue.</p>
      <Button onClick={() => window.open(update.url, "_blank")}>Update now</Button>
    </div>
  );
}
