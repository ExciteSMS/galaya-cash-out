import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/adminApi";

interface Refund {
  id: string;
  transaction_id: string;
  merchant_id: string;
  amount: number;
  reason: string;
  status: string;
  created_at: string;
  transactions?: { phone: string; provider: string; reference: string | null };
  merchants?: { name: string };
}

export default function AdminRefunds() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchRefunds = async () => {
    const { data, error } = await supabase
      .from("refunds")
      .select("*, transactions(phone, provider, reference), merchants(name)")
      .order("created_at", { ascending: false });
    if (!error && data) setRefunds(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchRefunds(); }, []);

  const handleAction = async (refund: Refund, action: "approved" | "rejected") => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("refunds")
      .update({ status: action, approved_by: user?.id, updated_at: new Date().toISOString() })
      .eq("id", refund.id);

    if (error) {
      toast.error("Failed to update refund");
      return;
    }

    if (action === "approved") {
      // Update original transaction status to refunded
      await supabase.from("transactions").update({ status: "refunded" }).eq("id", refund.transaction_id);
    }

    await logAudit(`refund_${action}`, "refund", refund.id, { amount: refund.amount, merchant: refund.merchants?.name });
    toast.success(`Refund ${action}`);
    fetchRefunds();
  };

  const filtered = refunds.filter(r => statusFilter === "all" || r.status === statusFilter);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold font-display">Refunds ({refunds.length})</h1>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-muted-foreground font-medium">Date</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Merchant</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Customer</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Amount</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Reason</th>
                  <th className="text-center p-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-center p-3 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 text-xs">{format(new Date(r.created_at), "dd MMM HH:mm")}</td>
                    <td className="p-3 text-xs">{r.merchants?.name || "—"}</td>
                    <td className="p-3 text-xs font-mono">{r.transactions?.phone || "—"}</td>
                    <td className="p-3 text-right font-mono">K{r.amount}</td>
                    <td className="p-3 text-xs max-w-[200px] truncate">{r.reason}</td>
                    <td className="p-3 text-center">
                      <Badge variant={r.status === "approved" ? "default" : r.status === "pending" ? "secondary" : "destructive"}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      {r.status === "pending" && (
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAction(r, "approved")} title="Approve">
                            <CheckCircle className="h-4 w-4 text-success" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAction(r, "rejected")} title="Reject">
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No refunds found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
