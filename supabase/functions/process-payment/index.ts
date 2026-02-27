import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MONEYUNIFY_API = "https://api.moneyunify.one/payments/request";

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

// Format phone: "0971234567" -> "260971234567"
function formatPhone(phone: string): string {
  if (phone.startsWith("0")) return "26" + phone;
  if (phone.startsWith("+260")) return phone.replace("+", "");
  if (phone.startsWith("260")) return phone;
  return "260" + phone;
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
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
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

    const merchantId = merchantData;
    const fee = calculateFee(amount);
    const reference = generateRef();

    // Create pending transaction in DB
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

    // Call MoneyUnify Request to Pay
    const authId = Deno.env.get("MONEYUNIFY_AUTH_ID");
    if (!authId) {
      return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formattedPhone = formatPhone(phone);
    const body = new URLSearchParams({
      from_payer: formattedPhone,
      amount: String(amount),
      auth_id: authId,
    });

    console.log("Calling MoneyUnify Request to Pay:", { phone: formattedPhone, amount, provider });

    const muResponse = await fetch(MONEYUNIFY_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: body.toString(),
    });

    const muData = await muResponse.json();
    console.log("MoneyUnify response:", JSON.stringify(muData));

    if (muData.isError) {
      // Update transaction to failed
      await supabase
        .from("transactions")
        .update({ status: "failed" })
        .eq("id", txData.id);

      return new Response(JSON.stringify({
        transaction: { ...txData, status: "failed" },
        success: false,
        error: muData.message || "Payment request failed",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Payment initiated — status will be "initiated" or "otp-pending"
    // Store the MoneyUnify transaction_id in the reference field for verification
    const muTransactionId = muData.data?.transaction_id;

    await supabase
      .from("transactions")
      .update({ reference: muTransactionId || reference })
      .eq("id", txData.id);

    return new Response(JSON.stringify({
      transaction: { ...txData, reference: muTransactionId || reference },
      success: true,
      moneyunify_status: muData.data?.status,
      transaction_id: muTransactionId,
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
