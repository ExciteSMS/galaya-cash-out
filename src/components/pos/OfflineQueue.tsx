import { useEffect, useState } from "react";
import { ArrowLeft, Wifi, WifiOff, RefreshCw, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { processPayment, Provider } from "@/lib/api";

interface QueuedSale {
  id: string;
  provider: Provider;
  phone: string;
  amount: number;
  queued_at: string;
  synced: boolean;
}

const STORAGE_KEY = "offline_sale_queue";

function loadQueue(): QueuedSale[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveQueue(q: QueuedSale[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(q));
}

const OfflineQueue = ({ onBack }: { onBack: () => void }) => {
  const { merchant } = useAuth();
  const [online, setOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<QueuedSale[]>(loadQueue());
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const pending = queue.filter((q) => !q.synced);

  const syncAll = async () => {
    if (!merchant || !online) return;
    setSyncing(true);
    const updated = [...queue];
    for (const sale of updated.filter((s) => !s.synced)) {
      try {
        const r = await processPayment(merchant.id, sale.provider, sale.phone, sale.amount);
        if (r.success) sale.synced = true;
      } catch (e: any) {
        toast.error(`Sync failed for ${sale.phone}`);
      }
    }
    setQueue(updated);
    saveQueue(updated);
    setSyncing(false);
    toast.success("Sync complete");
  };

  const removeSynced = () => {
    const next = queue.filter((q) => !q.synced);
    setQueue(next);
    saveQueue(next);
  };

  const clearAll = () => {
    setQueue([]);
    saveQueue([]);
  };

  // Demo: add a sample queued sale (so the user can see the flow)
  const addDemoSale = () => {
    const sale: QueuedSale = {
      id: crypto.randomUUID(),
      provider: "MTN",
      phone: "0961234567",
      amount: 100,
      queued_at: new Date().toISOString(),
      synced: false,
    };
    const next = [...queue, sale];
    setQueue(next);
    saveQueue(next);
    toast.success("Demo offline sale queued");
  };

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-display font-bold text-lg">Offline Queue</h2>
      </div>

      <div className={`rounded-xl p-3 mb-4 flex items-center gap-2 ${online ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
        {online ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
        <span className="text-sm font-medium">
          {online ? "Online" : "Offline — sales will queue here"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold font-display">{pending.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground">Synced</p>
          <p className="text-2xl font-bold font-display text-success">{queue.length - pending.length}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={syncAll}
          disabled={!online || pending.length === 0 || syncing}
          className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} /> Sync now
        </button>
        <button onClick={addDemoSale} className="px-3 py-2.5 bg-accent rounded-xl text-xs">+ Demo</button>
      </div>

      <div className="space-y-2 flex-1">
        {queue.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">No queued sales</p>
        ) : (
          queue.map((s) => (
            <div key={s.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{s.phone} · {s.provider}</p>
                <p className="text-xs text-muted-foreground">K{s.amount} · {new Date(s.queued_at).toLocaleString()}</p>
              </div>
              {s.synced ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : (
                <span className="text-[10px] px-2 py-0.5 bg-muted rounded-full">Pending</span>
              )}
            </div>
          ))
        )}
      </div>

      {queue.length > 0 && (
        <div className="flex gap-2 mt-4">
          <button onClick={removeSynced} className="flex-1 text-xs py-2 border border-border rounded-lg">Clear synced</button>
          <button onClick={clearAll} className="flex-1 text-xs py-2 border border-destructive/40 text-destructive rounded-lg flex items-center justify-center gap-1">
            <Trash2 className="w-3 h-3" /> Clear all
          </button>
        </div>
      )}
    </div>
  );
};

export default OfflineQueue;
