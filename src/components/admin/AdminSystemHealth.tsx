import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Database, Wifi, Clock } from "lucide-react";
import { format, subHours, subDays } from "date-fns";

interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "down";
  latency?: number;
  detail?: string;
}

interface ErrorRate {
  period: string;
  total: number;
  failed: number;
  rate: number;
}

export default function AdminSystemHealth() {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [errorRates, setErrorRates] = useState<ErrorRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    runChecks();
  }, []);

  const runChecks = async () => {
    setLoading(true);
    const results: HealthCheck[] = [];

    // Check database connectivity
    const dbStart = performance.now();
    try {
      const { error } = await supabase.from("app_settings").select("id").limit(1);
      const latency = Math.round(performance.now() - dbStart);
      results.push({
        name: "Database",
        status: error ? "degraded" : latency > 2000 ? "degraded" : "healthy",
        latency,
        detail: error ? error.message : `${latency}ms response`,
      });
    } catch {
      results.push({ name: "Database", status: "down", detail: "Connection failed" });
    }

    // Check auth service
    const authStart = performance.now();
    try {
      const { error } = await supabase.auth.getSession();
      const latency = Math.round(performance.now() - authStart);
      results.push({
        name: "Authentication",
        status: error ? "degraded" : "healthy",
        latency,
        detail: error ? error.message : `${latency}ms response`,
      });
    } catch {
      results.push({ name: "Authentication", status: "down", detail: "Service unreachable" });
    }

    // Check recent transaction error rates
    const now = new Date();
    const periods = [
      { label: "Last 1 hour", from: subHours(now, 1) },
      { label: "Last 24 hours", from: subDays(now, 1) },
      { label: "Last 7 days", from: subDays(now, 7) },
    ];

    const rates: ErrorRate[] = [];
    for (const p of periods) {
      const { data } = await supabase
        .from("transactions")
        .select("id, status")
        .gte("created_at", p.from.toISOString());

      const total = data?.length || 0;
      const failed = data?.filter((t) => t.status === "failed").length || 0;
      rates.push({
        period: p.label,
        total,
        failed,
        rate: total > 0 ? (failed / total) * 100 : 0,
      });
    }
    setErrorRates(rates);

    // Payment gateway check based on recent transactions
    const { data: recentTx } = await supabase
      .from("transactions")
      .select("status, provider")
      .gte("created_at", subHours(now, 1).toISOString());

    const providers = new Set((recentTx || []).map((t) => t.provider));
    if (providers.size === 0) {
      results.push({
        name: "Payment Gateway",
        status: "healthy",
        detail: "No recent transactions to evaluate",
      });
    } else {
      const failedTx = (recentTx || []).filter((t) => t.status === "failed").length;
      const failRate = recentTx?.length ? (failedTx / recentTx.length) * 100 : 0;
      results.push({
        name: "Payment Gateway",
        status: failRate > 50 ? "down" : failRate > 20 ? "degraded" : "healthy",
        detail: `${failRate.toFixed(1)}% failure rate (${recentTx?.length} txns last hour)`,
      });
    }

    // Fraud detection
    const { data: openFraud } = await supabase
      .from("fraud_alerts")
      .select("id")
      .eq("status", "open");

    results.push({
      name: "Fraud Detection",
      status: (openFraud?.length || 0) > 10 ? "degraded" : "healthy",
      detail: `${openFraud?.length || 0} open alerts`,
    });

    setChecks(results);
    setLastRefresh(new Date());
    setLoading(false);
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case "healthy": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "degraded": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "healthy": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "degraded": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      default: return "bg-red-500/10 text-red-600 border-red-500/20";
    }
  };

  const overallStatus = checks.some((c) => c.status === "down")
    ? "down"
    : checks.some((c) => c.status === "degraded")
    ? "degraded"
    : "healthy";

  const overallLabel = { healthy: "All Systems Operational", degraded: "Partial Degradation", down: "System Outage" };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            System Health
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time platform monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            Updated {format(lastRefresh, "HH:mm:ss")}
          </span>
          <Button variant="outline" size="sm" onClick={runChecks} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall status */}
      <div className={`rounded-xl border p-4 flex items-center gap-3 ${statusColor(overallStatus)}`}>
        {statusIcon(overallStatus)}
        <span className="font-medium text-sm">{loading ? "Checking..." : overallLabel[overallStatus]}</span>
      </div>

      {/* Service checks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wifi className="h-4 w-4" /> Service Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {checks.map((c) => (
            <div key={c.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                {statusIcon(c.status)}
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.detail}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {c.latency !== undefined && (
                  <span className="text-xs text-muted-foreground">{c.latency}ms</span>
                )}
                <Badge variant="secondary" className={`text-[10px] ${statusColor(c.status)}`}>
                  {c.status}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Error rates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" /> Transaction Error Rates
          </CardTitle>
          <CardDescription>Failed vs total transactions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorRates.map((er) => (
            <div key={er.period} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {er.period}
                </span>
                <span className="text-xs text-muted-foreground">
                  {er.failed}/{er.total} failed ({er.rate.toFixed(1)}%)
                </span>
              </div>
              <Progress
                value={er.total > 0 ? 100 - er.rate : 100}
                className="h-2"
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
