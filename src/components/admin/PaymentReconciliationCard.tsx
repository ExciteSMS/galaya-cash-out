import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw, Scale } from "lucide-react";

const STALE_MS = 24 * 60 * 60 * 1000;

export default function PaymentReconciliationCard() {
  const [pending, setPending] = useState(0);
  const [stale, setStale] = useState(0);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    const { count } = await supabase.from("transactions").select("id", { count: "exact", head: true }).eq("status", "pending");
    const { count: old } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .lt("created_at", new Date(Date.now() - STALE_MS).toISOString());
    setPending(count ?? 0);
    setStale(old ?? 0);
  }, []);

  useEffect(() => { load(); }, [load]);

  const reconcile = async () => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke("reconcile-payments", { body: {} });
    setRunning(false);
    if (error) return toast.error("Reconciliation failed");
    toast.success(`Checked ${data.checked}: ${data.succeeded} paid, ${data.failed} failed, ${data.still_pending} still pending`);
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5 text-primary" /> Payment reconciliation</CardTitle>
        <CardDescription>Checks stuck pending payments with the gateway. Also runs automatically every 5 minutes.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <span className="font-semibold">{pending}</span> pending
          {stale > 0 && <span className="ml-3 text-destructive font-semibold">{stale} older than 24h, check with the gateway</span>}
        </div>
        <Button size="sm" onClick={reconcile} disabled={running}>
          <RefreshCw className={`h-4 w-4 mr-1 ${running ? "animate-spin" : ""}`} /> Reconcile now
        </Button>
      </CardContent>
    </Card>
  );
}
