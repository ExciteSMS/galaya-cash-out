import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MONEYUNIFY_VERIFY_API = "https://api.moneyunify.one/payments/verify";

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
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
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

    const authId = Deno.env.get("MONEYUNIFY_AUTH_ID");
    if (!authId) {
      return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call MoneyUnify Verify Payment
    const body = new URLSearchParams({
      auth_id: authId,
      transaction_id: transaction_id,
    });

    const muResponse = await fetch(MONEYUNIFY_VERIFY_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: body.toString(),
    });

    const muData = await muResponse.json();
    console.log("MoneyUnify verify response:", JSON.stringify(muData));

    const status = muData.data?.status;
    const isSuccess = status === "successful" || status === "completed";
    const isFailed = status === "failed" || status === "rejected" || status === "cancelled";
    const isPending = !isSuccess && !isFailed;

    // Update DB transaction if we have the DB id and a final status
    if (db_transaction_id && (isSuccess || isFailed)) {
      const dbStatus = isSuccess ? "success" : "failed";
      await supabase
        .from("transactions")
        .update({ status: dbStatus })
        .eq("id", db_transaction_id);
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
