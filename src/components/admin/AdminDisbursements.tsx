import { useEffect, useState } from "react";
import { getAllDisbursements } from "@/lib/adminApi";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function AdminDisbursements() {
  const [disbursements, setDisbursements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllDisbursements().then((data) => {
      setDisbursements(data);
      setLoading(false);
    });
  }, []);

  const totalDisbursed = disbursements
    .filter((d) => d.status === "success")
    .reduce((s, d) => s + Number(d.amount), 0);
  const totalFees = disbursements
    .filter((d) => d.status === "success")
    .reduce((s, d) => s + Number(d.fee), 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display">Disbursements</h1>
        <div className="text-sm text-muted-foreground">
          Total: K{totalDisbursed.toLocaleString()} · Fees: K{totalFees.toFixed(2)}
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-muted-foreground font-medium">Date</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Merchant</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Amount</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Fee</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Net</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Reference</th>
                  <th className="text-center p-3 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {disbursements.map((d) => (
                  <tr key={d.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 text-xs">{format(new Date(d.created_at), "dd MMM HH:mm")}</td>
                    <td className="p-3 text-xs">{d.merchants?.name || "—"}</td>
                    <td className="p-3 text-right font-mono">K{Number(d.amount).toLocaleString()}</td>
                    <td className="p-3 text-right font-mono text-muted-foreground">K{Number(d.fee).toFixed(2)}</td>
                    <td className="p-3 text-right font-mono">K{Number(d.net_amount).toLocaleString()}</td>
                    <td className="p-3 text-xs font-mono text-muted-foreground">{d.reference || "—"}</td>
                    <td className="p-3 text-center">
                      <Badge variant={d.status === "success" ? "default" : d.status === "pending" ? "secondary" : "destructive"}>
                        {d.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {disbursements.length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No disbursements yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
