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

    // Load gateway config (prefer Lipila, fallback MoneyUnify)
    const { data: settingsRows } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", [
        "gateway_lipila_enabled",
        "gateway_moneyunify_enabled",
        "lipila_api_key",
        "moneyunify_auth_id",
      ]);
    const map: Record<string, string> = {};
    (settingsRows || []).forEach((r: any) => (map[r.key] = r.value));

    const lipilaKey = map.lipila_api_key || Deno.env.get("LIPILA_API_KEY") || "";
    const useLipila = map.gateway_lipila_enabled !== "false" && !!lipilaKey;
    const muAuth = map.moneyunify_auth_id || Deno.env.get("MONEYUNIFY_AUTH_ID") || "";

    if (!useLipila && !muAuth) {
      return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize phone
    let raw = String(disbursement.merchant_payout_accounts.phone_number).replace(/\D/g, "");
    if (raw.startsWith("260")) raw = raw.slice(3);
    else if (raw.startsWith("0")) raw = raw.slice(1);
    const localPhone = "0" + raw;          // 09XXXXXXXX (MoneyUnify)
    const intlPhone = "260" + raw;          // 260XXXXXXXXX (Lipila)

    await supabase
      .from("disbursements")
      .update({ status: "processing" })
      .eq("id", disbursement_id);

    const settleAmount = disbursement.net_amount;
    let success = false;
    let reference: string | null = null;
    let errorMsg: string | null = null;

    if (useLipila) {
      const refId = (disbursement.id as string).replace(/-/g, "").slice(0, 24);
      console.log("Lipila disbursement →", intlPhone, "amount:", settleAmount, "ref:", refId);
      try {
        const resp = await fetch("https://blz.lipila.io/api/v1/disbursements/mobile-money", {
          method: "POST",
          headers: {
            "accept": "application/json",
            "Content-Type": "application/json",
            "x-api-key": lipilaKey,
          },
          body: JSON.stringify({
            referenceId: refId,
            amount: settleAmount,
            accountNumber: intlPhone,
            currency: "ZMW",
            narration: `Galaya withdrawal ${refId}`,
          }),
        });
        const data = await resp.json().catch(() => ({}));
        console.log("Lipila response:", resp.status, JSON.stringify(data));
        const status = String(data?.status || "").toLowerCase();
        if (resp.ok && (status === "pending" || status === "success" || status === "successful")) {
          success = true;
          reference = data?.referenceId || data?.identifier || refId;
        } else {
          errorMsg = data?.message || `Lipila error (${resp.status})`;
        }
      } catch (e: any) {
        errorMsg = e?.message || "Lipila request failed";
      }
    } else {
      console.log("MoneyUnify settle →", localPhone, "amount:", settleAmount);
      const body = new URLSearchParams({
        to_receiver: localPhone,
        auth_id: muAuth,
        amount: String(settleAmount),
      });
      const resp = await fetch("https://api.moneyunify.one/settle", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
        },
        body: body.toString(),
      });
      const data = await resp.json().catch(() => ({}));
      console.log("MoneyUnify response:", JSON.stringify(data));
      if (data?.is_error) {
        errorMsg = data?.message || "Settlement failed";
      } else {
        success = true;
        reference = data?.data?.reference_id || null;
      }
    }

    if (!success) {
      await supabase
        .from("disbursements")
        .update({ status: "failed" })
        .eq("id", disbursement_id);
      return new Response(JSON.stringify({ success: false, error: errorMsg || "Settlement failed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lipila returns Pending initially — keep status pending if not final
    const finalStatus = useLipila ? "pending" : "success";
    await supabase
      .from("disbursements")
      .update({ status: finalStatus, reference })
      .eq("id", disbursement_id);

    return new Response(JSON.stringify({
      success: true,
      reference,
      gateway: useLipila ? "lipila" : "moneyunify",
      status: finalStatus,
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
