import { useEffect, useState, useMemo } from "react";
import { getAllTransactions } from "@/lib/adminApi";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO, isAfter, isBefore, startOfDay } from "date-fns";
import { Search, Download, Filter } from "lucide-react";

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    getAllTransactions().then((data) => {
      setTransactions(data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const q = search.toLowerCase();
      const matchSearch = !q || tx.phone?.toLowerCase().includes(q) || tx.merchants?.name?.toLowerCase().includes(q) || tx.reference?.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || tx.status === statusFilter;
      const matchProvider = providerFilter === "all" || tx.provider === providerFilter;
      const matchFrom = !dateFrom || isAfter(new Date(tx.created_at), startOfDay(parseISO(dateFrom)));
      const matchTo = !dateTo || isBefore(new Date(tx.created_at), new Date(new Date(dateTo).getTime() + 86400000));
      return matchSearch && matchStatus && matchProvider && matchFrom && matchTo;
    });
  }, [transactions, search, statusFilter, providerFilter, dateFrom, dateTo]);

  const providers = useMemo(() => [...new Set(transactions.map(t => t.provider))], [transactions]);

  const exportCSV = () => {
    const header = "Date,Merchant,Phone,Provider,Amount,Fee,Status,Reference\n";
    const rows = filtered.map(tx =>
      `"${format(new Date(tx.created_at), "yyyy-MM-dd HH:mm")}","${tx.merchants?.name || ""}","${tx.phone}","${tx.provider}",${tx.amount},${tx.fee},"${tx.status}","${tx.reference || ""}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const totalAmount = filtered.filter(t => t.status === "success").reduce((s, t) => s + t.amount, 0);
  const totalFees = filtered.filter(t => t.status === "success").reduce((s, t) => s + t.fee, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold font-display">All Transactions</h1>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search phone, merchant, reference..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {providers.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[150px]" />
            <span className="text-muted-foreground text-sm">to</span>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[150px]" />
            {(search || statusFilter !== "all" || providerFilter !== "all" || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); setProviderFilter("all"); setDateFrom(""); setDateTo(""); }}>
                Clear filters
              </Button>
            )}
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Showing {filtered.length} of {transactions.length}</span>
            <span>Volume: K{totalAmount.toLocaleString()}</span>
            <span>Fees: K{totalFees.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

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
                {filtered.map((tx) => (
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
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No transactions found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
