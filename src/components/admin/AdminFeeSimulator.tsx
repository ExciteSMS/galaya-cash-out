import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Calculator, TrendingUp, TrendingDown, DollarSign, ArrowRight } from "lucide-react";

export default function AdminFeeSimulator() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFeePercent, setNewFeePercent] = useState(2);
  const [newFlatFee, setNewFlatFee] = useState(0);

  useEffect(() => {
    supabase.from("transactions").select("amount, fee, status").eq("status", "success").then(({ data }) => {
      setTransactions(data || []);
      setLoading(false);
    });
  }, []);

  const analysis = useMemo(() => {
    const count = transactions.length;
    if (count === 0) return { currentRevenue: 0, projectedRevenue: 0, change: 0, avgTx: 0, count: 0 };
    const currentRevenue = transactions.reduce((s, t) => s + t.fee, 0);
    const projectedRevenue = transactions.reduce((s, t) => s + Math.round(t.amount * (newFeePercent / 100)) + newFlatFee, 0);
    const avgTx = Math.round(transactions.reduce((s, t) => s + t.amount, 0) / count);
    const change = currentRevenue > 0 ? Math.round(((projectedRevenue - currentRevenue) / currentRevenue) * 100) : 0;
    return { currentRevenue, projectedRevenue, change, avgTx, count };
  }, [transactions, newFeePercent, newFlatFee]);

  const sampleAmounts = [50, 100, 500, 1000, 5000, 10000];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2"><Calculator className="h-6 w-6 text-primary" /> Fee Simulator</h1>
        <p className="text-sm text-muted-foreground mt-1">Preview how fee changes impact platform revenue before going live</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Fee Configuration</CardTitle><CardDescription>Adjust parameters to simulate</CardDescription></CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Percentage Fee</span>
                <span className="font-bold text-foreground">{newFeePercent}%</span>
              </div>
              <Slider value={[newFeePercent]} onValueChange={v => setNewFeePercent(v[0])} min={0} max={10} step={0.5} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Flat Fee (ZMW)</span>
                <span className="font-bold text-foreground">K{newFlatFee}</span>
              </div>
              <Slider value={[newFlatFee]} onValueChange={v => setNewFlatFee(v[0])} min={0} max={50} step={1} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Revenue Impact</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Revenue</span>
              <span className="font-bold text-foreground">K{analysis.currentRevenue.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-center text-muted-foreground"><ArrowRight className="w-4 h-4" /></div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Projected Revenue</span>
              <span className={`font-bold ${analysis.change >= 0 ? "text-green-500" : "text-destructive"}`}>K{analysis.projectedRevenue.toLocaleString()}</span>
            </div>
            <div className={`flex items-center gap-1 justify-center text-sm font-medium ${analysis.change >= 0 ? "text-green-500" : "text-destructive"}`}>
              {analysis.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {analysis.change >= 0 ? "+" : ""}{analysis.change}% change
            </div>
            <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
              Based on {analysis.count.toLocaleString()} transactions · Avg K{analysis.avgTx.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Fee Comparison Table</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-left py-2 text-muted-foreground font-medium">Amount</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Current Fee</th>
                <th className="text-right py-2 text-muted-foreground font-medium">New Fee</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Diff</th>
              </tr></thead>
              <tbody>
                {sampleAmounts.map(amt => {
                  const currentFee = Math.round(amt * 0.02);
                  const newFee = Math.round(amt * (newFeePercent / 100)) + newFlatFee;
                  const diff = newFee - currentFee;
                  return (
                    <tr key={amt} className="border-b border-border/50">
                      <td className="py-2 text-foreground">K{amt.toLocaleString()}</td>
                      <td className="py-2 text-right text-muted-foreground">K{currentFee}</td>
                      <td className="py-2 text-right font-medium text-foreground">K{newFee}</td>
                      <td className={`py-2 text-right font-medium ${diff > 0 ? "text-green-500" : diff < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                        {diff > 0 ? "+" : ""}{diff === 0 ? "—" : `K${diff}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
