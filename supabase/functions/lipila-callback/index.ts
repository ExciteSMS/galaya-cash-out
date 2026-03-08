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
    const data = await req.json();
    console.log("Lipila callback received:", JSON.stringify(data));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
    const lookupRef = identifier || referenceId;
    const { data: updatedRows, error } = await supabase
      .from("transactions")
      .update({ status: dbStatus })
      .or(`reference.eq.${lookupRef},reference.eq.${referenceId}`)
      .select("*, merchants(name, phone_number)");

    if (error) {
      console.error("Callback update error:", error);
    }

    // Send SMS on success
    if (dbStatus === "success" && updatedRows && updatedRows.length > 0) {
      try {
        const tx = updatedRows[0];
        const merchantInfo = tx.merchants as any;
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sms`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchant_phone: merchantInfo?.phone_number,
            merchant_name: merchantInfo?.name,
            customer_phone: tx.phone,
            amount: tx.amount,
            reference: tx.reference,
            provider: tx.provider,
          }),
        });
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
