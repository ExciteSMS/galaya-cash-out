import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ShieldAlert, CheckCircle, Ban } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/adminApi";

interface FraudAlert {
  id: string;
  merchant_id: string | null;
  transaction_id: string | null;
  alert_type: string;
  severity: string;
  description: string;
  status: string;
  created_at: string;
  merchants?: { name: string; phone_number: string } | null;
}

export default function AdminFraudAlerts() {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchAlerts = async () => {
    const { data, error } = await supabase
      .from("fraud_alerts")
      .select("*, merchants(name, phone_number)")
      .order("created_at", { ascending: false });
    if (!error && data) setAlerts(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchAlerts(); }, []);

  const resolveAlert = async (alert: FraudAlert, action: "resolved" | "dismissed") => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("fraud_alerts")
      .update({ status: action, resolved_by: user?.id, resolved_at: new Date().toISOString() })
      .eq("id", alert.id);

    if (error) { toast.error("Failed to update alert"); return; }
    await logAudit(`fraud_alert_${action}`, "fraud_alert", alert.id, { type: alert.alert_type });
    toast.success(`Alert ${action}`);
    fetchAlerts();
  };

  const blockMerchant = async (alert: FraudAlert) => {
    if (!alert.merchant_id) return;
    const { error } = await supabase.from("merchants").update({ status: "suspended" }).eq("id", alert.merchant_id);
    if (error) { toast.error("Failed to block merchant"); return; }
    await logAudit("merchant_blocked_fraud", "merchant", alert.merchant_id, { alert_id: alert.id });
    await resolveAlert(alert, "resolved");
    toast.success("Merchant suspended");
  };

  const filtered = alerts.filter(a => statusFilter === "all" || a.status === statusFilter);
  const openCount = alerts.filter(a => a.status === "open").length;

  const severityColor = (s: string) => {
    if (s === "high") return "destructive";
    if (s === "medium") return "secondary";
    return "outline";
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          <h1 className="text-2xl font-bold font-display">Fraud Alerts</h1>
          {openCount > 0 && (
            <Badge variant="destructive">{openCount} open</Badge>
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No fraud alerts found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => (
            <Card key={alert.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={severityColor(alert.severity) as any}>{alert.severity}</Badge>
                      <span className="text-xs font-mono text-muted-foreground">{alert.alert_type}</span>
                      <Badge variant={alert.status === "open" ? "destructive" : "outline"}>{alert.status}</Badge>
                    </div>
                    <p className="text-sm">{alert.description}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{format(new Date(alert.created_at), "dd MMM yyyy HH:mm")}</span>
                      {alert.merchants && <span>Merchant: {alert.merchants.name}</span>}
                    </div>
                  </div>
                  {alert.status === "open" && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => resolveAlert(alert, "resolved")} title="Resolve">
                        <CheckCircle className="h-4 w-4 text-success mr-1" /> Resolve
                      </Button>
                      {alert.merchant_id && (
                        <Button variant="ghost" size="sm" onClick={() => blockMerchant(alert)} title="Block merchant">
                          <Ban className="h-4 w-4 text-destructive mr-1" /> Block
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => resolveAlert(alert, "dismissed")}>
                        Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
