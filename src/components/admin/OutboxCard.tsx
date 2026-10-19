import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw, Send } from "lucide-react";

interface FailedItem {
  id: string;
  kind: string;
  status: string;
  attempts: number;
  last_error: string | null;
  updated_at: string;
}

export default function OutboxCard() {
  const [pending, setPending] = useState(0);
  const [items, setItems] = useState<FailedItem[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { count } = await supabase.from("outbox").select("id", { count: "exact", head: true }).eq("status", "pending");
    const { data } = await supabase
      .from("outbox")
      .select("id, kind, status, attempts, last_error, updated_at")
      .or("status.eq.dead,and(status.eq.pending,attempts.gt.0)")
      .order("updated_at", { ascending: false })
      .limit(20);
    setPending(count ?? 0);
    setItems((data as FailedItem[]) ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const retry = async (id?: string) => {
    setBusy(true);
    const query = supabase.from("outbox").update({ status: "pending", attempts: 0, next_attempt_at: new Date().toISOString() });
    const { error } = id ? await query.eq("id", id) : await query.eq("status", "dead");
    if (!error) await supabase.functions.invoke("process-outbox", { body: {} });
    setBusy(false);
    if (error) return toast.error("Retry failed");
    toast.success("Retry queued");
    load();
  };

  const dead = items.filter((i) => i.status === "dead").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-primary" /> Delivery queue</CardTitle>
        <CardDescription>SMS, ZRA invoices and merchant webhooks are retried automatically with backoff.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span>{pending} waiting · {dead} failed permanently</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
            {dead > 0 && <Button size="sm" disabled={busy} onClick={() => retry()}>Retry all failed</Button>}
          </div>
        </div>
        {items.map((i) => (
          <div key={i.id} className="flex items-start justify-between gap-2 rounded border p-2 text-xs">
            <div>
              <div className="font-medium uppercase">{i.kind} · {i.status} · {i.attempts} tries</div>
              <div className="text-muted-foreground break-all">{i.last_error}</div>
            </div>
            {i.status === "dead" && <Button size="sm" variant="outline" disabled={busy} onClick={() => retry(i.id)}>Retry</Button>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
