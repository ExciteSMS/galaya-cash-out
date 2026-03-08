import { useEffect, useState } from "react";
import { getAllMerchants, getAllTransactions, getAllDisbursements } from "@/lib/adminApi";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Search, UserCheck, UserX, Eye } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/adminApi";

export default function AdminMerchants() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedMerchant, setSelectedMerchant] = useState<any>(null);

  useEffect(() => {
    Promise.all([getAllMerchants(), getAllTransactions()]).then(([m, t]) => {
      setMerchants(m);
      setTransactions(t);
      setLoading(false);
    });
  }, []);

  const toggleMerchantStatus = async (merchant: any) => {
    const newStatus = merchant.status === "active" ? "suspended" : "active";
    const { error } = await supabase
      .from("merchants")
      .update({ status: newStatus })
      .eq("id", merchant.id);
    if (error) {
      toast.error("Failed to update merchant status");
      return;
    }
    await logAudit(newStatus === "suspended" ? "merchant_suspended" : "merchant_activated", "merchant", merchant.id, { name: merchant.name });
    setMerchants(prev => prev.map(m => m.id === merchant.id ? { ...m, status: newStatus } : m));
    toast.success(`Merchant ${newStatus === "suspended" ? "suspended" : "activated"}`);
  };

  const getMerchantStats = (merchantId: string) => {
    const mTxs = transactions.filter(t => t.merchant_id === merchantId);
    const successful = mTxs.filter(t => t.status === "success");
    return {
      totalTx: mTxs.length,
      successTx: successful.length,
      totalVolume: successful.reduce((s, t) => s + t.amount, 0),
      totalFees: successful.reduce((s, t) => s + t.fee, 0),
      recentTxs: mTxs.slice(0, 10),
    };
  };

  const filtered = merchants.filter(m => {
    const q = search.toLowerCase();
    return !q || m.name?.toLowerCase().includes(q) || m.phone_number?.includes(q);
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold font-display">Merchants ({merchants.length})</h1>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-muted-foreground font-medium">Name</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Phone</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Address</th>
                  <th className="text-center p-3 text-muted-foreground font-medium">Txns</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Volume</th>
                  <th className="text-center p-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Joined</th>
                  <th className="text-center p-3 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const stats = getMerchantStats(m.id);
                  return (
                    <tr key={m.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3 font-medium">{m.name}</td>
                      <td className="p-3 font-mono text-xs">{m.phone_number}</td>
                      <td className="p-3 text-xs text-muted-foreground">{m.address || "—"}</td>
                      <td className="p-3 text-center text-xs">{stats.totalTx}</td>
                      <td className="p-3 text-right font-mono text-xs">K{stats.totalVolume.toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <Badge variant={m.status === "active" ? "default" : "destructive"}>
                          {m.status || "active"}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs">{format(new Date(m.created_at), "dd MMM yyyy")}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedMerchant(m)} title="View details">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => toggleMerchantStatus(m)}
                            title={m.status === "active" ? "Suspend" : "Activate"}
                          >
                            {m.status === "active" || !m.status ? (
                              <UserX className="h-3.5 w-3.5 text-destructive" />
                            ) : (
                              <UserCheck className="h-3.5 w-3.5 text-success" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No merchants found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Merchant Detail Dialog */}
      <Dialog open={!!selectedMerchant} onOpenChange={() => setSelectedMerchant(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedMerchant?.name}</DialogTitle>
          </DialogHeader>
          {selectedMerchant && (() => {
            const stats = getMerchantStats(selectedMerchant.id);
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <div className="text-xl font-bold">{stats.totalTx}</div>
                    <div className="text-xs text-muted-foreground">Total Txns</div>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <div className="text-xl font-bold">K{stats.totalVolume.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Volume</div>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <div className="text-xl font-bold">K{stats.totalFees.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Fees Generated</div>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <div className="text-xl font-bold">{stats.successTx ? Math.round((stats.successTx / stats.totalTx) * 100) : 0}%</div>
                    <div className="text-xs text-muted-foreground">Success Rate</div>
                  </div>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="font-mono">{selectedMerchant.phone_number}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span>{selectedMerchant.address || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant={selectedMerchant.status === "active" ? "default" : "destructive"}>{selectedMerchant.status || "active"}</Badge></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Joined</span><span>{format(new Date(selectedMerchant.created_at), "dd MMM yyyy")}</span></div>
                </div>
                {stats.recentTxs.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Recent Transactions</h4>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {stats.recentTxs.map((tx: any) => (
                        <div key={tx.id} className="flex items-center justify-between text-xs bg-muted/50 rounded p-2">
                          <span>{format(new Date(tx.created_at), "dd MMM HH:mm")}</span>
                          <span className="font-mono">{tx.phone}</span>
                          <span className="font-mono">K{tx.amount}</span>
                          <Badge variant={tx.status === "success" ? "default" : tx.status === "pending" ? "secondary" : "destructive"} className="text-[10px]">
                            {tx.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
