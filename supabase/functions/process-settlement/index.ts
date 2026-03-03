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

    const { disbursement_id } = await req.json();
    if (!disbursement_id) {
      return new Response(JSON.stringify({ error: "disbursement_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the disbursement record
    const { data: disbursement, error: dError } = await supabase
      .from("disbursements")
      .select("*, merchant_payout_accounts(*)")
      .eq("id", disbursement_id)
      .single();

    if (dError || !disbursement) {
      return new Response(JSON.stringify({ error: "Disbursement not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify merchant owns this disbursement
    const { data: merchantId } = await supabase.rpc("get_merchant_id");
    if (disbursement.merchant_id !== merchantId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (disbursement.status !== "pending") {
      return new Response(JSON.stringify({ error: "Disbursement already processed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get MoneyUnify auth_id
    let authId: string | null = null;
    const { data: settingData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "moneyunify_auth_id")
      .single();
    if (settingData?.value) authId = settingData.value;
    if (!authId) authId = Deno.env.get("MONEYUNIFY_AUTH_ID") || null;
    if (!authId) {
      return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format phone
    let toReceiver = disbursement.merchant_payout_accounts.phone_number;
    if (toReceiver.startsWith("+260")) toReceiver = "0" + toReceiver.slice(4);
    else if (toReceiver.startsWith("260")) toReceiver = "0" + toReceiver.slice(3);
    else if (!toReceiver.startsWith("0")) toReceiver = "0" + toReceiver;

    // Update status to processing
    await supabase
      .from("disbursements")
      .update({ status: "processing" })
      .eq("id", disbursement_id);

    const settleAmount = disbursement.net_amount;

    console.log("Settling to:", toReceiver, "amount:", settleAmount);

    const body = new URLSearchParams({
      to_receiver: toReceiver,
      auth_id: authId,
      amount: String(settleAmount),
    });

    const response = await fetch("https://api.moneyunify.one/settle", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: body.toString(),
    });

    const data = await response.json();
    console.log("Settlement response:", JSON.stringify(data));

    if (data.is_error) {
      await supabase
        .from("disbursements")
        .update({ status: "failed" })
        .eq("id", disbursement_id);

      return new Response(JSON.stringify({
        success: false,
        error: data.message || "Settlement failed",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update disbursement to success
    const reference = data.data?.reference_id || null;
    await supabase
      .from("disbursements")
      .update({ status: "success", reference })
      .eq("id", disbursement_id);

    return new Response(JSON.stringify({
      success: true,
      reference,
      amount: data.data?.amount,
      cost: data.data?.cost,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Settlement error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
