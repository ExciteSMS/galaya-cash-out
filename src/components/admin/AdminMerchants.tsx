import { useEffect, useState } from "react";
import { getAllMerchants } from "@/lib/adminApi";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

export default function AdminMerchants() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllMerchants().then((data) => {
      setMerchants(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold font-display">Merchants</h1>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-muted-foreground font-medium">Name</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Phone</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Address</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {merchants.map((m) => (
                  <tr key={m.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 font-medium">{m.name}</td>
                    <td className="p-3 font-mono text-xs">{m.phone_number}</td>
                    <td className="p-3 text-xs text-muted-foreground">{m.address || "—"}</td>
                    <td className="p-3 text-xs">{format(new Date(m.created_at), "dd MMM yyyy")}</td>
                  </tr>
                ))}
                {merchants.length === 0 && (
                  <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No merchants yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
