import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MONEYUNIFY_VERIFY_API = "https://api.moneyunify.one/payments/verify";

async function getActiveGateway(): Promise<{ gateway: string; credentials: Record<string, string> }> {
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: settings } = await adminClient
    .from("app_settings")
    .select("key, value")
    .in("key", ["gateway_lipila_enabled", "gateway_moneyunify_enabled", "lipila_api_key", "moneyunify_auth_id"]);

  const map: Record<string, string> = {};
  settings?.forEach((s: any) => (map[s.key] = s.value));

  if (map.gateway_lipila_enabled === "true" && map.lipila_api_key) {
    return { gateway: "lipila", credentials: { api_key: map.lipila_api_key } };
  }

  if (map.gateway_moneyunify_enabled !== "false") {
    const authId = map.moneyunify_auth_id || Deno.env.get("MONEYUNIFY_AUTH_ID") || "";
    if (authId) {
      return { gateway: "moneyunify", credentials: { auth_id: authId } };
    }
  }

  return { gateway: "none", credentials: {} };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { transaction_id, db_transaction_id } = await req.json();

    if (!transaction_id) {
      return new Response(JSON.stringify({ error: "Missing transaction_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { gateway, credentials } = await getActiveGateway();

    if (gateway === "lipila") {
      // Lipila uses callback-based verification — check DB status directly
      // The transaction status is returned in the initial response
      // For polling, we check if the DB has been updated via callback
      if (db_transaction_id) {
        const { data: txData } = await supabase
          .from("transactions")
          .select("status")
          .eq("id", db_transaction_id)
          .single();

        const dbStatus = txData?.status || "pending";
        return new Response(JSON.stringify({
          status: dbStatus === "success" ? "success" : dbStatus === "failed" ? "failed" : "pending",
          moneyunify_status: dbStatus,
          message: dbStatus === "success" ? "Payment confirmed" : dbStatus === "failed" ? "Payment failed" : "Payment pending",
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        status: "pending",
        moneyunify_status: "pending",
        message: "Awaiting payment confirmation",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MoneyUnify verification
    if (!credentials.auth_id) {
      return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = new URLSearchParams({
      auth_id: credentials.auth_id,
      transaction_id: transaction_id,
    });

    const muResponse = await fetch(MONEYUNIFY_VERIFY_API, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
      body: body.toString(),
    });

    const muData = await muResponse.json();
    console.log("MoneyUnify verify response:", JSON.stringify(muData));

    const status = muData.data?.status;
    const isSuccess = status === "successful" || status === "completed";
    const isFailed = status === "failed" || status === "rejected" || status === "cancelled";

    if (db_transaction_id && (isSuccess || isFailed)) {
      const dbStatus = isSuccess ? "success" : "failed";
      await supabase.from("transactions").update({ status: dbStatus }).eq("id", db_transaction_id);
    }

    return new Response(JSON.stringify({
      status: isSuccess ? "success" : isFailed ? "failed" : "pending",
      moneyunify_status: status,
      message: muData.message,
      data: muData.data,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Verify payment error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
