import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { RefreshCw, RotateCw } from "lucide-react";
import { toast } from "sonner";

interface Inv {
  id: string; invoice_no: number; invoice_type: string; amount: number; tax_amount: number;
  status: string; rcpt_no: string | null; error: string | null; attempts: number; created_at: string;
  qr_url: string | null; merchants?: { name: string } | null;
}

const AdminZraInvoices = () => {
  const [rows, setRows] = useState<Inv[]>([]);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("zra_invoices")
      .select("id, invoice_no, invoice_type, amount, tax_amount, status, rcpt_no, error, attempts, created_at, qr_url, merchants(name)")
      .order("created_at", { ascending: false }).limit(300);
    setRows((data as any) || []);
  };
  useEffect(() => { load(); }, []);

  const retry = async (id: string) => {
    setBusy(id);
    const { data } = await supabase.functions.invoke("zra-invoice", { body: { action: "retry", invoice_id: id } });
    setBusy(null);
    data?.success ? toast.success("Invoice accepted by ZRA") : toast.error(data?.error || "Retry failed");
    load();
  };

  const retryAllFailed = async () => {
    const failed = rows.filter((r) => r.status !== "success");
    for (const r of failed) await supabase.functions.invoke("zra-invoice", { body: { action: "retry", invoice_id: r.id } });
    toast.success(`Retried ${failed.length} invoices`);
    load();
  };

  const filtered = rows.filter((r) => filter === "all" || r.status === filter);
  const count = (s: string) => rows.filter((r) => r.status === s).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">ZRA Smart Invoices</h2>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="success">Accepted</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          <Button variant="destructive" onClick={retryAllFailed} disabled={!count("failed") && !count("pending")}>Retry failed</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[["Accepted", "success"], ["Failed", "failed"], ["Pending", "pending"]].map(([l, s]) => (
          <Card key={s}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="text-2xl font-bold">{count(s)}</p></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b border-border">
              <tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Merchant</th><th className="p-3 text-left">No.</th><th className="p-3 text-left">Type</th><th className="p-3 text-right">Amount</th><th className="p-3 text-right">VAT</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">ZRA receipt / error</th><th className="p-3" /></tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border">
                  <td className="p-3 whitespace-nowrap">{format(new Date(r.created_at), "dd MMM HH:mm")}</td>
                  <td className="p-3">{r.merchants?.name || "—"}</td>
                  <td className="p-3 font-mono">#{r.invoice_no}</td>
                  <td className="p-3">{r.invoice_type === "credit_note" ? "Credit note" : "Sale"}</td>
                  <td className="p-3 text-right">K{Number(r.amount).toLocaleString()}</td>
                  <td className="p-3 text-right">K{Number(r.tax_amount).toFixed(2)}</td>
                  <td className="p-3"><Badge variant={r.status === "success" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>{r.status}</Badge></td>
                  <td className="p-3 text-xs max-w-xs truncate" title={r.error || ""}>
                    {r.status === "success"
                      ? (r.qr_url ? <a href={r.qr_url} target="_blank" rel="noreferrer" className="underline">{r.rcpt_no}</a> : r.rcpt_no)
                      : <span className="text-destructive">{r.error}</span>}
                  </td>
                  <td className="p-3">
                    {r.status !== "success" && (
                      <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => retry(r.id)}>
                        <RotateCw className={`w-3 h-3 mr-1 ${busy === r.id ? "animate-spin" : ""}`} />Retry ({r.attempts})
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No ZRA invoices yet</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminZraInvoices;
