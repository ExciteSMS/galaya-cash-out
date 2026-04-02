import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, ArrowLeftRight, UserPlus, RotateCcw, ShieldAlert, Wallet, Bell, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface FeedEvent {
  id: string;
  type: "transaction" | "signup" | "refund" | "fraud" | "withdrawal" | "notification";
  title: string;
  description: string;
  timestamp: string;
  severity?: "info" | "warning" | "error" | "success";
}

const typeConfig: Record<string, { icon: React.ElementType; color: string }> = {
  transaction: { icon: ArrowLeftRight, color: "text-primary" },
  signup: { icon: UserPlus, color: "text-success" },
  refund: { icon: RotateCcw, color: "text-warning" },
  fraud: { icon: ShieldAlert, color: "text-destructive" },
  withdrawal: { icon: Wallet, color: "text-accent-foreground" },
  notification: { icon: Bell, color: "text-muted-foreground" },
};

export default function AdminActivityFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout>();

  const fetchEvents = async () => {
    const evts: FeedEvent[] = [];

    // Fetch recent transactions
    const { data: txs } = await supabase
      .from("transactions")
      .select("*, merchants(name)")
      .order("created_at", { ascending: false })
      .limit(20);

    (txs || []).forEach((tx: any) => {
      evts.push({
        id: `tx-${tx.id}`,
        type: "transaction",
        title: `K${tx.amount} ${tx.status === "success" ? "payment received" : tx.status === "pending" ? "payment pending" : "payment failed"}`,
        description: `${tx.merchants?.name || "Unknown"} · ${tx.provider} · ${tx.phone}`,
        timestamp: tx.created_at,
        severity: tx.status === "success" ? "success" : tx.status === "pending" ? "info" : "error",
      });
    });

    // Fetch recent refunds
    const { data: refunds } = await supabase
      .from("refunds")
      .select("*, merchants(name)")
      .order("created_at", { ascending: false })
      .limit(10);

    (refunds || []).forEach((r: any) => {
      evts.push({
        id: `ref-${r.id}`,
        type: "refund",
        title: `K${r.amount} refund ${r.status}`,
        description: `${r.merchants?.name || "Unknown"} · ${r.reason || "No reason"}`,
        timestamp: r.created_at,
        severity: r.status === "approved" ? "success" : r.status === "rejected" ? "error" : "warning",
      });
    });

    // Fetch recent fraud alerts
    const { data: frauds } = await supabase
      .from("fraud_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    (frauds || []).forEach((f: any) => {
      evts.push({
        id: `fraud-${f.id}`,
        type: "fraud",
        title: `${f.severity} fraud alert: ${f.alert_type}`,
        description: f.description,
        timestamp: f.created_at,
        severity: f.severity === "high" ? "error" : "warning",
      });
    });

    // Fetch recent disbursements
    const { data: disbs } = await supabase
      .from("disbursements")
      .select("*, merchants(name)")
      .order("created_at", { ascending: false })
      .limit(10);

    (disbs || []).forEach((d: any) => {
      evts.push({
        id: `disb-${d.id}`,
        type: "withdrawal",
        title: `K${d.amount} withdrawal ${d.status}`,
        description: `${d.merchants?.name || "Unknown"} · Fee: K${d.fee}`,
        timestamp: d.created_at,
        severity: d.status === "completed" ? "success" : d.status === "failed" ? "error" : "info",
      });
    });

    // Sort all by timestamp
    evts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setEvents(evts);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchEvents, 15000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh]);

  const filtered = filter === "all" ? events : events.filter(e => e.type === filter);

  const severityBadge = (severity?: string) => {
    const map: Record<string, string> = {
      success: "bg-success/10 text-success border-success/20",
      error: "bg-destructive/10 text-destructive border-destructive/20",
      warning: "bg-warning/10 text-warning border-warning/20",
      info: "bg-primary/10 text-primary border-primary/20",
    };
    return map[severity || "info"] || map.info;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Live Activity Feed
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time stream of platform events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="transaction">Transactions</SelectItem>
              <SelectItem value="refund">Refunds</SelectItem>
              <SelectItem value="fraud">Fraud</SelectItem>
              <SelectItem value="withdrawal">Withdrawals</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant={autoRefresh ? "default" : "outline"} onClick={() => setAutoRefresh(!autoRefresh)}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? "Live" : "Paused"}
          </Button>
        </div>
      </div>

      {/* Live indicator */}
      {autoRefresh && (
        <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-primary font-medium">Auto-refreshing every 15 seconds</span>
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} events</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event Timeline</CardTitle>
          <CardDescription>Latest platform activity across all merchants</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">No events found</p>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

              <div className="space-y-1">
                {filtered.slice(0, 50).map((evt) => {
                  const config = typeConfig[evt.type] || typeConfig.notification;
                  const Icon = config.icon;
                  return (
                    <div key={evt.id} className="relative flex items-start gap-3 pl-2 py-2 hover:bg-muted/50 rounded-lg transition-colors">
                      <div className={`relative z-10 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon className={`w-3 h-3 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">{evt.title}</p>
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${severityBadge(evt.severity)}`}>
                            {evt.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{evt.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {format(new Date(evt.timestamp), "MMM d, HH:mm:ss")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
