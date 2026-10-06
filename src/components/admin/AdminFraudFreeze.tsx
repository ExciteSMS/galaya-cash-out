import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAllMerchants, logAudit } from "@/lib/adminApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShieldAlert, Snowflake, Sun, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export default function AdminFraudFreeze() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [freezeReasons, setFreezeReasons] = useState<Record<string, string>>({});

  const load = async () => {
    const [{ data: alertData }, merchantData] = await Promise.all([
      supabase.from("fraud_alerts").select("*, merchants(name)").order("created_at", { ascending: false }).limit(50),
      getAllMerchants(),
    ]);
    setAlerts(alertData || []);
    setMerchants(merchantData || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setFrozen = async (merchant: any, frozen: boolean) => {
    const reason = freezeReasons[merchant.id] || "";
    if (frozen && !reason.trim()) {
      toast.error("Enter a freeze reason first");
      return;
    }
    const { error } = await supabase
      .from("merchants")
      .update({ status: frozen ? "frozen" : "active" })
      .eq("id", merchant.id);
    if (error) { toast.error(error.message); return; }
    await logAudit(frozen ? "merchant_frozen" : "merchant_unfrozen", "merchant", merchant.id, {
      name: merchant.name,
      reason: reason || undefined,
    });
    toast.success(frozen ? `${merchant.name} frozen` : `${merchant.name} unfrozen`);
    load();
  };

  const resolveAlert = async (alert: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("fraud_alerts")
      .update({ status: "resolved", resolved_by: user?.id, resolved_at: new Date().toISOString() })
      .eq("id", alert.id);
    if (error) { toast.error(error.message); return; }
    await logAudit("fraud_alert_resolved", "fraud_alert", alert.id, { type: alert.alert_type });
    toast.success("Alert resolved");
    load();
  };

  const openAlerts = alerts.filter((a) => a.status === "open");
  const frozen = merchants.filter((m) => m.status === "frozen");

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-primary" /> Fraud & Freeze
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review flagged activity and freeze suspicious merchants. Frozen merchants cannot process payments.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Open alerts</p>
            <p className="text-2xl font-bold text-foreground">{openAlerts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Frozen merchants</p>
            <p className="text-2xl font-bold text-foreground">{frozen.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fraud Alerts</CardTitle>
          <CardDescription>Automatically flagged suspicious activity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {alerts.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No fraud alerts yet.</p>}
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border">
              <div className="flex items-start gap-3 min-w-0">
                <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${alert.severity === "high" ? "text-destructive" : "text-yellow-500"}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{alert.alert_type.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground truncate">{alert.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {alert.merchants?.name || "Unknown merchant"} · {format(new Date(alert.created_at), "dd MMM, HH:mm")}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <Badge variant={alert.status === "open" ? "destructive" : "secondary"} className="text-[10px]">
                  {alert.status}
                </Badge>
                {alert.status === "open" && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => resolveAlert(alert)}>
                    Resolve
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Merchant Freeze Controls</CardTitle>
          <CardDescription>Freeze a merchant to block all their payment processing instantly</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {merchants.map((m) => {
            const isFrozen = m.status === "frozen";
            return (
              <div key={m.id} className="p-3 rounded-lg border border-border space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{m.phone_number}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={isFrozen ? "destructive" : "secondary"} className="text-[10px]">
                      {m.status}
                    </Badge>
                    {isFrozen ? (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setFrozen(m, false)}>
                        <Sun className="w-3 h-3 mr-1" /> Unfreeze
                      </Button>
                    ) : (
                      <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => setFrozen(m, true)}>
                        <Snowflake className="w-3 h-3 mr-1" /> Freeze
                      </Button>
                    )}
                  </div>
                </div>
                {!isFrozen && (
                  <Input
                    placeholder="Freeze reason (required)"
                    className="h-8 text-xs"
                    value={freezeReasons[m.id] || ""}
                    onChange={(e) => setFreezeReasons((prev) => ({ ...prev, [m.id]: e.target.value }))}
                  />
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
