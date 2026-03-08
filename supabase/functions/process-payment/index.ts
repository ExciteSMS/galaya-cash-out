import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MONEYUNIFY_API = "https://api.moneyunify.one/payments/request";
const LIPILA_API = "https://api.lipila.dev/api/v1/collections/mobile-money";

function calculateFee(amount: number): number {
  if (amount <= 50) return 1;
  if (amount <= 200) return 3;
  if (amount <= 500) return 5;
  if (amount <= 1000) return 8;
  return 10;
}

function generateRef(): string {
  return "GAL" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
}

function formatPhoneLocal(phone: string): string {
  if (phone.startsWith("+260")) return "0" + phone.slice(4);
  if (phone.startsWith("260")) return "0" + phone.slice(3);
  if (phone.startsWith("0") && phone.length === 10) return phone;
  return "0" + phone;
}

function formatPhoneInternational(phone: string): string {
  if (phone.startsWith("+260")) return phone.slice(1);
  if (phone.startsWith("260") && phone.length === 12) return phone;
  if (phone.startsWith("0") && phone.length === 10) return "260" + phone.slice(1);
  return "260" + phone;
}

async function getActiveGateway(supabase: any): Promise<{ gateway: string; credentials: Record<string, string> }> {
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

  // Prefer Lipila if enabled
  if (map.gateway_lipila_enabled === "true" && map.lipila_api_key) {
    return { gateway: "lipila", credentials: { api_key: map.lipila_api_key } };
  }

  // Fallback to MoneyUnify
  if (map.gateway_moneyunify_enabled !== "false") {
    const authId = map.moneyunify_auth_id || Deno.env.get("MONEYUNIFY_AUTH_ID") || "";
    if (authId) {
      return { gateway: "moneyunify", credentials: { auth_id: authId } };
    }
  }

  return { gateway: "none", credentials: {} };
}

async function processWithMoneyUnify(phone: string, amount: number, authId: string) {
  const formattedPhone = formatPhoneLocal(phone);
  const body = new URLSearchParams({
    from_payer: formattedPhone,
    amount: String(amount),
    auth_id: authId,
  });

  console.log("Calling MoneyUnify Request to Pay:", { phone: formattedPhone, amount });

  const response = await fetch(MONEYUNIFY_API, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
    body: body.toString(),
  });

  const data = await response.json();
  console.log("MoneyUnify response:", JSON.stringify(data));

  if (data.isError) {
    return { success: false, error: data.message || "Payment request failed" };
  }

  return {
    success: true,
    transaction_id: data.data?.transaction_id,
    status: data.data?.status,
  };
}

async function processWithLipila(phone: string, amount: number, apiKey: string, reference: string) {
  const formattedPhone = formatPhoneInternational(phone);

  const body = {
    referenceId: reference,
    amount: amount,
    narration: "Payment collection",
    accountNumber: formattedPhone,
    currency: "ZMW",
  };

  console.log("Calling Lipila MoMo Collection:", { phone: formattedPhone, amount });

  const response = await fetch(LIPILA_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  console.log("Lipila response:", JSON.stringify(data));

  if (data.status === "Failed" || response.status >= 400) {
    return { success: false, error: data.message || "Payment request failed" };
  }

  return {
    success: true,
    transaction_id: data.identifier || data.referenceId,
    status: data.status || "Pending",
  };
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

    const { provider, phone, amount } = await req.json();

    if (!provider || !phone || !amount) {
      return new Response(JSON.stringify({ error: "Missing provider, phone, or amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["MTN", "Airtel", "Zamtel"].includes(provider)) {
      return new Response(JSON.stringify({ error: "Invalid provider" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (amount < 1 || amount > 10000) {
      return new Response(JSON.stringify({ error: "Amount must be between K1 and K10,000" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: merchantData } = await supabase.rpc("get_merchant_id");
    if (!merchantData) {
      return new Response(JSON.stringify({ error: "Merchant profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine active gateway
    const { gateway, credentials } = await getActiveGateway(supabase);
    if (gateway === "none") {
      return new Response(JSON.stringify({ error: "No payment gateway configured. Set API keys in admin settings." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const merchantId = merchantData;
    const fee = calculateFee(amount);
    const reference = generateRef();

    // Create pending transaction
    const { data: txData, error: insertError } = await supabase
      .from("transactions")
      .insert({
        merchant_id: merchantId,
        provider,
        phone,
        amount,
        fee,
        status: "pending",
        reference,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create transaction" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process via active gateway
    let result;
    if (gateway === "lipila") {
      result = await processWithLipila(phone, amount, credentials.api_key, reference);
    } else {
      result = await processWithMoneyUnify(phone, amount, credentials.auth_id);
    }

    if (!result.success) {
      await supabase.from("transactions").update({ status: "failed" }).eq("id", txData.id);
    }

    // Run fraud detection asynchronously (fire and forget)
    try {
      const fraudClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/check-fraud`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ merchant_id: merchantId, transaction_id: txData.id, phone, amount }),
      }).catch(e => console.error("Fraud check fire-and-forget error:", e));
    } catch (e) {
      console.error("Fraud check setup error:", e);
    }

    if (!result.success) {
      return new Response(JSON.stringify({
        transaction: { ...txData, status: "failed" },
        success: false,
        error: result.error,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update reference with gateway transaction ID
    const gatewayTxId = result.transaction_id;
    await supabase.from("transactions").update({ reference: gatewayTxId || reference }).eq("id", txData.id);

    return new Response(JSON.stringify({
      transaction: { ...txData, reference: gatewayTxId || reference },
      success: true,
      moneyunify_status: result.status,
      transaction_id: gatewayTxId,
      gateway,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Process payment error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
