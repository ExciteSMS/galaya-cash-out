import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Provider API configurations (to be replaced with real credentials)
const PROVIDER_CONFIG: Record<string, { name: string; apiUrl: string }> = {
  MTN: {
    name: "MTN MoMo",
    apiUrl: "https://sandbox.momodeveloper.mtn.com",
  },
  Airtel: {
    name: "Airtel Money",
    apiUrl: "https://openapi.airtel.africa",
  },
  Zamtel: {
    name: "Zamtel Kwacha",
    apiUrl: "https://api.zamtel.co.zm",
  },
};

function calculateFee(amount: number): number {
  if (amount <= 50) return 1;
  if (amount <= 200) return 3;
  if (amount <= 500) return 5;
  if (amount <= 1000) return 8;
  return 10;
}

function generateRef(): string {
  return (
    "GAL" +
    Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).substring(2, 6).toUpperCase()
  );
}

// Simulate MoMo USSD push - replace with real API calls when credentials are available
async function initiateMoMoPush(
  provider: string,
  phone: string,
  amount: number,
  reference: string
): Promise<{ success: boolean; providerRef?: string; error?: string }> {
  const config = PROVIDER_CONFIG[provider];
  if (!config) return { success: false, error: "Unknown provider" };

  // TODO: Replace with real API calls per provider:
  // MTN: POST /collection/v1_0/requesttopay with X-Reference-Id, Ocp-Apim-Subscription-Key
  // Airtel: POST /merchant/v1/payments/ with client_id/client_secret auth
  // Zamtel: POST /api/v1/payment/request with merchant credentials

  // Realistic simulation: random 2-4s processing time
  const processingTime = 2000 + Math.random() * 2000;
  await new Promise((r) => setTimeout(r, processingTime));

  // 90% success rate simulation
  const success = Math.random() > 0.1;
  if (success) {
    return {
      success: true,
      providerRef: `${provider.substring(0, 3).toUpperCase()}${Date.now().toString().slice(-8)}`,
    };
  }
  return { success: false, error: "Customer did not approve or timeout" };
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

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { provider, phone, amount } = await req.json();

    // Validate inputs
    if (!provider || !phone || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing provider, phone, or amount" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!PROVIDER_CONFIG[provider]) {
      return new Response(JSON.stringify({ error: "Invalid provider" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (amount < 1 || amount > 10000) {
      return new Response(
        JSON.stringify({ error: "Amount must be between K1 and K10,000" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get merchant ID
    const { data: merchantData } = await supabase.rpc("get_merchant_id");
    if (!merchantData) {
      return new Response(
        JSON.stringify({ error: "Merchant profile not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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
      return new Response(
        JSON.stringify({ error: "Failed to create transaction" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initiate MoMo push
    const result = await initiateMoMoPush(provider, phone, amount, reference);

    // Update transaction status
    const finalStatus = result.success ? "success" : "failed";
    const { data: updatedTx } = await supabase
      .from("transactions")
      .update({ status: finalStatus })
      .eq("id", txData.id)
      .select()
      .single();

    return new Response(
      JSON.stringify({
        transaction: updatedTx || txData,
        providerRef: result.providerRef,
        success: result.success,
        error: result.error,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
