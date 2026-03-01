import { useEffect, useState } from "react";
import { getAllTransactions } from "@/lib/adminApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllTransactions().then((data) => {
      setTransactions(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold font-display">All Transactions</h1>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-muted-foreground font-medium">Date</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Merchant</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Phone</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Provider</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Amount</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Fee</th>
                  <th className="text-center p-3 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 text-xs">{format(new Date(tx.created_at), "dd MMM HH:mm")}</td>
                    <td className="p-3 text-xs">{tx.merchants?.name || "—"}</td>
                    <td className="p-3 text-xs font-mono">{tx.phone}</td>
                    <td className="p-3 text-xs">{tx.provider}</td>
                    <td className="p-3 text-right font-mono">K{tx.amount}</td>
                    <td className="p-3 text-right font-mono text-muted-foreground">K{tx.fee}</td>
                    <td className="p-3 text-center">
                      <Badge variant={tx.status === "success" ? "default" : tx.status === "pending" ? "secondary" : "destructive"}>
                        {tx.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No transactions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
