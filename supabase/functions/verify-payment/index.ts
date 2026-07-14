import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MONEYUNIFY_VERIFY_API = "https://api.moneyunify.one/payments/verify";
// Lipila PRODUCTION status endpoint (live keys). Sandbox is https://api.lipila.dev
const LIPILA_STATUS_API = "https://blz.lipila.io/api/v1/collections/check-status";
const LENCO_STATUS_API = "https://api.lenco.co/access/v2/collection/status";

async function getActiveGateway(): Promise<{ gateway: string; credentials: Record<string, string> }> {
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: settings } = await adminClient
    .from("app_settings")
    .select("key, value")
    .in("key", [
      "gateway_lipila_enabled", "gateway_moneyunify_enabled", "gateway_lenco_enabled",
      "lipila_api_key", "moneyunify_auth_id", "lenco_api_key",
    ]);

  const map: Record<string, string> = {};
  settings?.forEach((s: any) => (map[s.key] = s.value));

  const lencoKey = map.lenco_api_key || Deno.env.get("LENCO_API_KEY") || "";
  if (map.gateway_lenco_enabled === "true" && lencoKey) {
    return { gateway: "lenco", credentials: { api_key: lencoKey } };
  }

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

    if (gateway === "lenco") {
      let dbStatus: string = "pending";
      if (db_transaction_id) {
        const { data: txData } = await supabase
          .from("transactions")
          .select("status, reference")
          .eq("id", db_transaction_id)
          .single();
        dbStatus = txData?.status || "pending";

        if (dbStatus === "pending" && credentials.api_key) {
          const ref = txData?.reference || transaction_id;
          try {
            const url = `${LENCO_STATUS_API}/${encodeURIComponent(ref)}`;
            const r = await fetch(url, {
              method: "GET",
              headers: { "accept": "application/json", "Authorization": `Bearer ${credentials.api_key}` },
            });
            const raw = await r.text();
            console.log("Lenco status poll:", r.status, raw);
            let d: any = {};
            try { d = JSON.parse(raw); } catch { d = { message: raw }; }
            const s = String(d?.data?.status || d?.status || "").toLowerCase();
            if (s === "successful" || s === "success" || s === "completed" || s === "paid") {
              dbStatus = "success";
            } else if (s === "failed" || s === "rejected" || s === "cancelled" || s === "declined") {
              dbStatus = "failed";
            }

            if (dbStatus === "success" || dbStatus === "failed") {
              await supabase.from("transactions").update({ status: dbStatus }).eq("id", db_transaction_id);
              if (dbStatus === "success") {
                try {
                  const { data: txRow } = await supabase
                    .from("transactions")
                    .select("*, merchants(name, phone_number)")
                    .eq("id", db_transaction_id)
                    .single();
                  if (txRow) {
                    const m = txRow.merchants as any;
                    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sms`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        merchant_phone: m?.phone_number,
                        merchant_name: m?.name,
                        customer_phone: txRow.phone,
                        amount: txRow.amount,
                        reference: txRow.reference,
                        provider: txRow.provider,
                      }),
                    }).catch((e) => console.error("SMS error:", e));
                  }
                } catch (e) { console.error("SMS lookup error:", e); }
              }
            }
          } catch (e) {
            console.error("Lenco status poll error:", e);
          }
        }

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
        status: "pending", moneyunify_status: "pending", message: "Awaiting payment confirmation",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (gateway === "lipila") {
      // First check DB (callback may have updated it already)
      let dbStatus: string = "pending";
      if (db_transaction_id) {
        const { data: txData } = await supabase
          .from("transactions")
          .select("status, reference")
          .eq("id", db_transaction_id)
          .single();
        dbStatus = txData?.status || "pending";

        // If still pending, actively poll Lipila status endpoint
        if (dbStatus === "pending" && credentials.api_key) {
          const ref = txData?.reference || transaction_id;
          try {
            const url = `${LIPILA_STATUS_API}?referenceId=${encodeURIComponent(ref)}`;
            const r = await fetch(url, {
              method: "GET",
              headers: { "accept": "application/json", "x-api-key": credentials.api_key },
            });
            const raw = await r.text();
            console.log("Lipila status poll:", r.status, raw);
            let d: any = {};
            try { d = JSON.parse(raw); } catch { d = { message: raw }; }
            const s = String(d?.status || "").toLowerCase();
            if (s === "successful" || s === "success" || s === "completed") {
              dbStatus = "success";
            } else if (s === "failed" || s === "rejected" || s === "cancelled") {
              dbStatus = "failed";
            }

            // Persist if status resolved
            if (dbStatus === "success" || dbStatus === "failed") {
              await supabase.from("transactions").update({ status: dbStatus }).eq("id", db_transaction_id);

              if (dbStatus === "success") {
                try {
                  const { data: txRow } = await supabase
                    .from("transactions")
                    .select("*, merchants(name, phone_number)")
                    .eq("id", db_transaction_id)
                    .single();
                  if (txRow) {
                    const m = txRow.merchants as any;
                    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sms`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        merchant_phone: m?.phone_number,
                        merchant_name: m?.name,
                        customer_phone: txRow.phone,
                        amount: txRow.amount,
                        reference: txRow.reference,
                        provider: txRow.provider,
                      }),
                    }).catch((e) => console.error("SMS error:", e));
                  }
                } catch (e) { console.error("SMS lookup error:", e); }
              }
            }
          } catch (e) {
            console.error("Lipila status poll error:", e);
          }
        }

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

      // Send SMS on success
      if (isSuccess) {
        try {
          const { data: txRow } = await supabase
            .from("transactions")
            .select("*, merchants(name, phone_number)")
            .eq("id", db_transaction_id)
            .single();

          if (txRow) {
            const merchantInfo = txRow.merchants as any;
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sms`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                merchant_phone: merchantInfo?.phone_number,
                merchant_name: merchantInfo?.name,
                customer_phone: txRow.phone,
                amount: txRow.amount,
                reference: txRow.reference,
                provider: txRow.provider,
              }),
            });
          }
        } catch (smsErr) {
          console.error("SMS trigger error:", smsErr);
        }
      }
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
