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

    const { phone_number } = await req.json();
    if (!phone_number) {
      return new Response(JSON.stringify({ error: "Phone number required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format phone to local 10-digit
    let formatted = phone_number;
    if (formatted.startsWith("+260")) formatted = "0" + formatted.slice(4);
    else if (formatted.startsWith("260")) formatted = "0" + formatted.slice(3);
    else if (!formatted.startsWith("0")) formatted = "0" + formatted;

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

    const body = new URLSearchParams({
      auth_id: authId,
      phone_number: formatted,
    });

    console.log("Account lookup for:", formatted);

    const response = await fetch("https://api.moneyunify.one/account/lookup", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: body.toString(),
    });

    const data = await response.json();
    console.log("Account lookup response:", JSON.stringify(data));

    if (data.isError) {
      return new Response(JSON.stringify({
        success: false,
        error: data.message || "Account lookup failed",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      account_name: data.data?.accountName || null,
      operator: data.data?.operator || null,
      phone: data.data?.phone || formatted,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Account lookup error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
