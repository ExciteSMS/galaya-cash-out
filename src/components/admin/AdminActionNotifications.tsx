import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, DollarSign, ShieldAlert, UserPlus, RotateCcw, ArrowDownToLine } from "lucide-react";
import { format, subHours } from "date-fns";

interface ActionItem {
  id: string;
  type: "high_value" | "fraud" | "signup" | "refund" | "withdrawal";
  title: string;
  description: string;
  time: string;
  severity: "info" | "warning" | "critical";
}

const ICON_MAP = {
  high_value: DollarSign,
  fraud: ShieldAlert,
  signup: UserPlus,
  refund: RotateCcw,
  withdrawal: ArrowDownToLine,
};

const SEVERITY_COLORS = {
  info: "bg-primary/10 text-primary border-primary/20",
  warning: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  critical: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function AdminActionNotifications() {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const since = subHours(new Date(), 24).toISOString();
      const [txRes, fraudRes, merchantRes, refundRes, disbRes] = await Promise.all([
        supabase.from("transactions").select("*").gte("created_at", since).gte("amount", 5000).eq("status", "success").order("created_at", { ascending: false }).limit(10),
        supabase.from("fraud_alerts").select("*").gte("created_at", since).eq("status", "open").order("created_at", { ascending: false }).limit(10),
        supabase.from("merchants").select("id, name, phone_number, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(10),
        supabase.from("refunds").select("*, transactions(phone)").gte("created_at", since).eq("status", "pending").order("created_at", { ascending: false }).limit(10),
        supabase.from("disbursements").select("*").gte("created_at", since).eq("status", "pending").order("created_at", { ascending: false }).limit(10),
      ]);

      const actions: ActionItem[] = [];
      (txRes.data || []).forEach(t => actions.push({
        id: `tx-${t.id}`, type: "high_value", title: `High-value payment K${t.amount.toLocaleString()}`,
        description: `From ${t.phone} via ${t.provider}`, time: t.created_at, severity: t.amount >= 8000 ? "warning" : "info",
      }));
      (fraudRes.data || []).forEach(f => actions.push({
        id: `fr-${f.id}`, type: "fraud", title: `Fraud Alert: ${f.alert_type}`,
        description: f.description, time: f.created_at, severity: f.severity === "high" ? "critical" : "warning",
      }));
      (merchantRes.data || []).forEach(m => actions.push({
        id: `mc-${m.id}`, type: "signup", title: `New merchant: ${m.name}`,
        description: m.phone_number, time: m.created_at, severity: "info",
      }));
      (refundRes.data || []).forEach(r => actions.push({
        id: `rf-${r.id}`, type: "refund", title: `Refund request K${r.amount}`,
        description: r.reason || "No reason given", time: r.created_at, severity: "warning",
      }));
      (disbRes.data || []).forEach(d => actions.push({
        id: `db-${d.id}`, type: "withdrawal", title: `Withdrawal request K${d.amount}`,
        description: `Fee: K${d.fee}`, time: d.created_at, severity: d.amount >= 5000 ? "warning" : "info",
      }));

      actions.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setItems(actions);
      setLoading(false);
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2"><Bell className="h-6 w-6 text-primary" /> Action Notifications</h1>
        <p className="text-sm text-muted-foreground mt-1">Alerts for high-value transactions, fraud, signups, and pending requests (last 24h)</p>
      </div>

      {items.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground"><Bell className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No action items in the last 24 hours</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const Icon = ICON_MAP[item.type];
            return (
              <div key={item.id} className={`flex items-start gap-3 p-3 rounded-lg border ${SEVERITY_COLORS[item.severity]}`}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-background/50">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs opacity-75">{item.description}</p>
                </div>
                <span className="text-[10px] opacity-60 flex-shrink-0">{format(new Date(item.time), "HH:mm")}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
