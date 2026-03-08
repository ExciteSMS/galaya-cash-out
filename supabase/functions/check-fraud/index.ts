import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { merchant_id, transaction_id, phone, amount } = await req.json();
    const alerts: { alert_type: string; severity: string; description: string; merchant_id: string; transaction_id?: string }[] = [];

    // Rule 1: Rapid successive transactions (>5 in 5 minutes from same merchant)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentTxs } = await supabase
      .from("transactions")
      .select("id")
      .eq("merchant_id", merchant_id)
      .gte("created_at", fiveMinAgo);

    if (recentTxs && recentTxs.length > 5) {
      alerts.push({
        alert_type: "rapid_transactions",
        severity: "high",
        description: `${recentTxs.length} transactions in 5 minutes from merchant`,
        merchant_id,
        transaction_id,
      });
    }

    // Rule 2: Unusual amount (>K5000 single transaction)
    if (amount > 5000) {
      alerts.push({
        alert_type: "high_amount",
        severity: "medium",
        description: `High-value transaction of K${amount} detected`,
        merchant_id,
        transaction_id,
      });
    }

    // Rule 3: Same phone number used across multiple merchants in 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: crossMerchantTxs } = await supabase
      .from("transactions")
      .select("merchant_id")
      .eq("phone", phone)
      .gte("created_at", oneHourAgo);

    if (crossMerchantTxs) {
      const uniqueMerchants = new Set(crossMerchantTxs.map(t => t.merchant_id));
      if (uniqueMerchants.size > 2) {
        alerts.push({
          alert_type: "cross_merchant_phone",
          severity: "high",
          description: `Phone ${phone} used across ${uniqueMerchants.size} merchants in 1 hour`,
          merchant_id,
          transaction_id,
        });
      }
    }

    // Rule 4: Multiple failed transactions (>3 failures in 10 min from same merchant)
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: failedTxs } = await supabase
      .from("transactions")
      .select("id")
      .eq("merchant_id", merchant_id)
      .eq("status", "failed")
      .gte("created_at", tenMinAgo);

    if (failedTxs && failedTxs.length > 3) {
      alerts.push({
        alert_type: "multiple_failures",
        severity: "medium",
        description: `${failedTxs.length} failed transactions in 10 minutes`,
        merchant_id,
        transaction_id,
      });
    }

    // Insert alerts
    if (alerts.length > 0) {
      await supabase.from("fraud_alerts").insert(alerts);
    }

    return new Response(JSON.stringify({ alerts_created: alerts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Fraud check error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
