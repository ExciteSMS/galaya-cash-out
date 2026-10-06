import { useState } from "react";
import { ArrowLeft, FileDown, CalendarDays } from "lucide-react";
import { getTransactions } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, subDays } from "date-fns";

export default function StatementsExport({ onBack }: { onBack: () => void }) {
  const { merchant } = useAuth();
  const [range, setRange] = useState<"7" | "30" | "90" | "all">("30");
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const all = await getTransactions();
      const filtered = range === "all"
        ? all
        : all.filter((t) => new Date(t.created_at) >= subDays(new Date(), Number(range)));

      if (filtered.length === 0) {
        toast.error("No transactions in this period");
        setExporting(false);
        return;
      }

      const header = "Date,Reference,Provider,Phone,Amount (K),Fee (K),Status";
      const rows = filtered.map((t) =>
        [
          format(new Date(t.created_at), "yyyy-MM-dd HH:mm"),
          t.reference || "",
          t.provider,
          t.phone,
          t.amount,
          t.fee,
          t.status,
        ].join(",")
      );
      const csv = [header, ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `galaya-statement-${merchant?.name?.replace(/\s+/g, "-").toLowerCase() || "merchant"}-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${filtered.length} transactions`);
    } catch (err: any) {
      toast.error(err.message || "Export failed");
    }
    setExporting(false);
  };

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2 mb-1">
        <FileDown className="w-5 h-5 text-primary" /> Statements
      </h2>
      <p className="text-xs text-muted-foreground mb-6">Download your transaction history as a CSV file.</p>

      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <p className="text-xs font-medium text-foreground mb-3 flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-primary" /> Period
        </p>
        <div className="grid grid-cols-4 gap-2">
          {([["7", "7 days"], ["30", "30 days"], ["90", "90 days"], ["all", "All time"]] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setRange(value)}
              className={`text-xs py-2 rounded-lg font-medium ${
                range === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <p className="text-xs font-medium text-foreground mb-2">Statement includes</p>
        <ul className="text-[11px] text-muted-foreground space-y-1">
          <li>· Date and time of each transaction</li>
          <li>· Reference code, provider and customer phone</li>
          <li>· Amount, fee and final status</li>
        </ul>
      </div>

      <button
        onClick={handleExport}
        disabled={exporting}
        className="w-full bg-primary text-primary-foreground text-sm font-medium py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <FileDown className="w-4 h-4" />
        {exporting ? "Preparing..." : "Download CSV Statement"}
      </button>
    </div>
  );
}
