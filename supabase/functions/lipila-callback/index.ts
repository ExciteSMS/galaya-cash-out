import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Callbacks must carry the shared secret configured in Admin > Settings (?token=...).
    const { data: secretRow } = await supabase.from("app_settings").select("value").eq("key", "callback_secret").maybeSingle();
    const expected = secretRow?.value || "";
    const provided = new URL(req.url).searchParams.get("token") || "";
    if (!expected || provided.length !== expected.length || provided !== expected) {
      console.warn("Lipila callback rejected: bad or missing token");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await req.json();
    console.log("Lipila callback received:", JSON.stringify(data));

    const referenceId = data.referenceId;
    const identifier = data.identifier;
    const status = data.status;

    if (!referenceId && !identifier) {
      return new Response(JSON.stringify({ error: "Missing reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map Lipila status to our status
    let dbStatus = "pending";
    if (status === "Successful" || status === "successful" || status === "Completed" || status === "completed") {
      dbStatus = "success";
    } else if (status === "Failed" || status === "failed" || status === "Rejected" || status === "rejected") {
      dbStatus = "failed";
    }

    // Find and update transaction by reference
    const refs = [identifier, referenceId].filter((r): r is string => typeof r === "string" && /^[\w.-]{1,100}$/.test(r));
    if (refs.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Only pending transactions can change, so a replayed or forged callback can't flip a settled payment.
    const { data: updatedRows, error } = await supabase
      .from("transactions")
      .update({ status: dbStatus })
      .in("reference", refs)
      .eq("status", "pending")
      .select("*, merchants(name, phone_number)");

    if (error) {
      console.error("Callback update error:", error);
    }

    // Send SMS on success
    if (dbStatus === "success" && updatedRows && updatedRows.length > 0) {
      try {
        const tx = updatedRows[0];
        const merchantInfo = tx.merchants as any;
      } catch (smsErr) {
        console.error("SMS trigger error:", smsErr);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Lipila callback error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
