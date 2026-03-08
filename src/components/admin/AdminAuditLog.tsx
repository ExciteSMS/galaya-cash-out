import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ScrollText } from "lucide-react";

export default function AdminAuditLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("admin_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setLogs(data || []);
        setLoading(false);
      });
  }, []);

  const actionColors: Record<string, string> = {
    merchant_suspended: "destructive",
    merchant_activated: "default",
    settings_updated: "secondary",
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ScrollText className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold font-display">Audit Log</h1>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-muted-foreground font-medium">Time</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Action</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Target</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 text-xs">{format(new Date(log.created_at), "dd MMM HH:mm:ss")}</td>
                    <td className="p-3">
                      <Badge variant={(actionColors[log.action] as any) || "secondary"} className="text-[10px]">
                        {log.action.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs">
                      {log.target_type && <span className="text-muted-foreground">{log.target_type}: </span>}
                      <span className="font-mono">{log.target_id?.slice(0, 8) || "—"}</span>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {log.details ? (typeof log.details === "string" ? log.details : JSON.stringify(log.details)) : "—"}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No audit logs yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
