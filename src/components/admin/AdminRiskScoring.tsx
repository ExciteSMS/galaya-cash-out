import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, RefreshCw, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ScoredMerchant {
  id: string;
  name: string;
  phone_number: string;
  risk_score: number;
  risk_band: string;
  txn_count: number;
  failed_count: number;
  refund_count: number;
  fraud_count: number;
}

function bandColor(b: string) {
  switch (b) {
    case "high": return "bg-destructive/10 text-destructive";
    case "medium": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
    default: return "bg-success/10 text-success";
  }
}

export default function AdminRiskScoring() {
  const [merchants, setMerchants] = useState<ScoredMerchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  const compute = async () => {
    setLoading(true);
    const { data: ms } = await supabase.from("merchants").select("id, name, phone_number, risk_score, risk_band");
    const { data: txns } = await supabase.from("transactions").select("merchant_id, status");
    const { data: refunds } = await supabase.from("refunds").select("merchant_id");
    const { data: frauds } = await supabase.from("fraud_alerts").select("merchant_id");

    const scored: ScoredMerchant[] = (ms || []).map((m: any) => {
      const merchTxns = (txns || []).filter((t: any) => t.merchant_id === m.id);
      const failedCount = merchTxns.filter((t: any) => t.status === "failed").length;
      const refundCount = (refunds || []).filter((r: any) => r.merchant_id === m.id).length;
      const fraudCount = (frauds || []).filter((f: any) => f.merchant_id === m.id).length;
      const failRate = merchTxns.length > 0 ? failedCount / merchTxns.length : 0;
      const score = Math.min(
        100,
        Math.round(failRate * 40 + refundCount * 5 + fraudCount * 15)
      );
      const band = score >= 60 ? "high" : score >= 30 ? "medium" : "low";
      return {
        id: m.id,
        name: m.name,
        phone_number: m.phone_number,
        risk_score: score,
        risk_band: band,
        txn_count: merchTxns.length,
        failed_count: failedCount,
        refund_count: refundCount,
        fraud_count: fraudCount,
      };
    });

    setMerchants(scored.sort((a, b) => b.risk_score - a.risk_score));
    setLoading(false);
  };

  useEffect(() => { compute(); }, []);

  const persistScores = async () => {
    setRecalculating(true);
    for (const m of merchants) {
      await supabase.from("merchants").update({
        risk_score: m.risk_score,
        risk_band: m.risk_band,
      }).eq("id", m.id);
    }
    setRecalculating(false);
    toast.success("Risk scores saved to merchants");
  };

  const high = merchants.filter((m) => m.risk_band === "high").length;
  const med = merchants.filter((m) => m.risk_band === "medium").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Merchant Risk Scoring
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Auto-scored on chargebacks, refunds, fraud flags, and failure rates.
          </p>
        </div>
        <Button onClick={persistScores} disabled={recalculating} size="sm">
          <RefreshCw className={`w-3 h-3 mr-2 ${recalculating ? "animate-spin" : ""}`} />
          Save scores
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">High risk</p>
          <p className="text-2xl font-bold font-display text-destructive">{high}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Medium risk</p>
          <p className="text-2xl font-bold font-display text-yellow-600">{med}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Total scored</p>
          <p className="text-2xl font-bold font-display">{merchants.length}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ranked by risk</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            merchants.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  {m.risk_band === "high" && <AlertTriangle className="w-4 h-4 text-destructive" />}
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.phone_number} · {m.txn_count} txn · {m.failed_count} failed · {m.refund_count} refunds · {m.fraud_count} fraud
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${bandColor(m.risk_band)}`}>
                    {m.risk_band}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">Score: {m.risk_score}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
