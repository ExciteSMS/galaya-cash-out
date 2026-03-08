import { Transaction } from "@/lib/api";
import { Search, Download, FileText, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import RefundRequest from "./RefundRequest";

interface TransactionHistoryProps {
  transactions: Transaction[];
}

function exportCSV(transactions: Transaction[]) {
  const header = "Date,Time,Phone,Provider,Amount,Fee,Net,Status,Reference\n";
  const rows = transactions.map((tx) => {
    const d = new Date(tx.created_at);
    return `${d.toLocaleDateString()},${d.toLocaleTimeString()},${tx.phone},${tx.provider},${tx.amount},${tx.fee},${tx.amount - tx.fee},${tx.status},${tx.reference || ""}`;
  }).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("CSV downloaded");
}

function exportPDF(transactions: Transaction[]) {
  const totalAmount = transactions.filter(t => t.status === "success").reduce((s, t) => s + t.amount, 0);
  const totalFees = transactions.filter(t => t.status === "success").reduce((s, t) => s + t.fee, 0);

  const rows = transactions.map((tx) => {
    const d = new Date(tx.created_at);
    return `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:11px;">${d.toLocaleDateString()}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:11px;">${tx.phone}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:11px;">${tx.provider}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:11px;text-align:right;">K${tx.amount}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:11px;text-align:right;">K${tx.fee}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:11px;text-align:right;">K${tx.amount - tx.fee}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:11px;">${tx.status}</td>
      </tr>`;
  }).join("");

  const html = `
    <html><head><title>Transaction Report</title></head>
    <body style="font-family:Arial,sans-serif;margin:20px;">
      <h1 style="font-size:18px;color:#333;">Galaya Transaction Report</h1>
      <p style="font-size:12px;color:#666;">Generated: ${new Date().toLocaleString()} · ${transactions.length} transactions</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;">
        <thead>
          <tr style="background:#f5f5f5;">
            <th style="padding:8px;text-align:left;font-size:11px;">Date</th>
            <th style="padding:8px;text-align:left;font-size:11px;">Phone</th>
            <th style="padding:8px;text-align:left;font-size:11px;">Provider</th>
            <th style="padding:8px;text-align:right;font-size:11px;">Amount</th>
            <th style="padding:8px;text-align:right;font-size:11px;">Fee</th>
            <th style="padding:8px;text-align:right;font-size:11px;">Net</th>
            <th style="padding:8px;text-align:left;font-size:11px;">Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top:16px;padding:12px;background:#f9f9f9;border-radius:8px;">
        <p style="font-size:12px;margin:2px 0;"><strong>Total Sales:</strong> K${totalAmount.toLocaleString()}</p>
        <p style="font-size:12px;margin:2px 0;"><strong>Total Fees:</strong> K${totalFees.toLocaleString()}</p>
        <p style="font-size:12px;margin:2px 0;"><strong>Net Earnings:</strong> K${(totalAmount - totalFees).toLocaleString()}</p>
      </div>
    </body></html>`;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }
  toast.success("PDF ready for download");
}

const TransactionHistory = ({ transactions }: TransactionHistoryProps) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "success" | "failed">("all");
  const [refundTx, setRefundTx] = useState<Transaction | null>(null);

  if (refundTx) {
    return <RefundRequest transaction={refundTx} onBack={() => setRefundTx(null)} onSuccess={() => setRefundTx(null)} />;
  }

  const filtered = transactions.filter((tx) => {
    if (filter !== "all" && tx.status !== filter) return false;
    if (search && !tx.phone.includes(search) && !(tx.reference || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalSuccess = transactions.filter((t) => t.status === "success").reduce((s, t) => s + t.amount, 0);
  const totalFees = transactions.filter((t) => t.status === "success").reduce((s, t) => s + t.fee, 0);

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display font-bold text-lg text-foreground">Transactions</h2>
        <div className="flex gap-1">
          <button
            onClick={() => exportCSV(filtered)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title="Download CSV"
          >
            <Download className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => exportPDF(filtered)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title="Download PDF"
          >
            <FileText className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        {transactions.length} transactions · K{totalSuccess.toLocaleString()} sales · K{(totalSuccess - totalFees).toLocaleString()} net
      </p>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by phone or reference..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex gap-2 mb-4">
        {(["all", "success", "failed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pb-20">
        {filtered.map((tx) => (
          <div
            key={tx.id}
            className="bg-card rounded-xl p-3 border border-border flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                  tx.provider === "MTN" ? "bg-mtn" : tx.provider === "Zamtel" ? "bg-zamtel" : "bg-airtel"
                }`}
              >
                {tx.provider[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{tx.phone}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(tx.created_at).toLocaleDateString()} · {new Date(tx.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">{tx.reference}</p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-0.5">
              <p className="text-sm font-semibold text-foreground">K{tx.amount.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">-K{tx.fee} fee</p>
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  tx.status === "success"
                    ? "bg-success/10 text-success"
                    : tx.status === "refunded"
                    ? "bg-primary/10 text-primary"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {tx.status}
              </span>
              {tx.status === "success" && (
                <button
                  onClick={() => setRefundTx(tx)}
                  className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5 mt-0.5"
                >
                  <RotateCcw className="w-3 h-3" /> Refund
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No transactions found</p>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
