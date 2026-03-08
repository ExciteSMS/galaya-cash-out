import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXCITE_SMS_API = "https://gateway.excitesms.com/api/v3/sms/send";

interface SmsRequest {
  recipient: string;
  message: string;
}

function formatPhoneInternational(phone: string): string {
  if (phone.startsWith("+")) return phone.slice(1);
  if (phone.startsWith("0") && phone.length === 10) return "260" + phone.slice(1);
  if (phone.startsWith("260")) return phone;
  return "260" + phone;
}

async function getSmsSettings(): Promise<{
  enabled: boolean;
  apiKey: string;
  senderId: string;
  notifyMerchant: boolean;
  notifyCustomer: boolean;
}> {
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: settings } = await adminClient
    .from("app_settings")
    .select("key, value")
    .in("key", [
      "sms_enabled",
      "excite_sms_api_key",
      "excite_sms_sender_id",
      "sms_notify_merchant",
      "sms_notify_customer",
    ]);

  const map: Record<string, string> = {};
  settings?.forEach((s: any) => (map[s.key] = s.value));

  return {
    enabled: map.sms_enabled === "true",
    apiKey: map.excite_sms_api_key || "",
    senderId: map.excite_sms_sender_id || "Galaya",
    notifyMerchant: map.sms_notify_merchant !== "false",
    notifyCustomer: map.sms_notify_customer !== "false",
  };
}

async function sendSms(apiKey: string, senderId: string, recipient: string, message: string): Promise<boolean> {
  try {
    const response = await fetch(EXCITE_SMS_API, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        recipient: formatPhoneInternational(recipient),
        sender_id: senderId,
        type: "plain",
        message,
      }),
    });

    const data = await response.json();
    console.log("Excite SMS response:", JSON.stringify(data));
    return response.ok;
  } catch (err) {
    console.error("SMS send error:", err);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      merchant_phone,
      merchant_name,
      customer_phone,
      amount,
      reference,
      provider,
    } = await req.json();

    const smsConfig = await getSmsSettings();

    if (!smsConfig.enabled || !smsConfig.apiKey) {
      return new Response(JSON.stringify({ sent: false, reason: "SMS not enabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { merchant?: boolean; customer?: boolean } = {};

    // SMS to merchant
    if (smsConfig.notifyMerchant && merchant_phone) {
      const msg = `Payment received! K${amount} from ${customer_phone} via ${provider} Money. Ref: ${reference}. - ${merchant_name || "Galaya"}`;
      results.merchant = await sendSms(smsConfig.apiKey, smsConfig.senderId, merchant_phone, msg);
    }

    // SMS to customer
    if (smsConfig.notifyCustomer && customer_phone) {
      const msg = `Payment of K${amount} to ${merchant_name || "Merchant"} confirmed. Ref: ${reference}. Thank you!`;
      results.customer = await sendSms(smsConfig.apiKey, smsConfig.senderId, customer_phone, msg);
    }

    return new Response(JSON.stringify({ sent: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-sms error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
