import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ROLES = ["manager", "supervisor", "cashier", "viewer"];
const PHONE_RE = /^0\d{9}$/;
const PIN_RE = /^\d{4}$/;
const BAN_FOREVER = "876000h";

const phoneToEmail = (phone: string) => `${phone}@galaya.app`;
const pinToPassword = (pin: string) => `galaya_${pin}`;

async function createLogin(phone: string, pin: string): Promise<{ id?: string; error?: string }> {
  const { data, error } = await admin.auth.admin.createUser({
    email: phoneToEmail(phone), password: pinToPassword(pin), email_confirm: true,
  });
  if (error || !data.user) return { error: "That phone number is already registered" };
  return { id: data.user.id };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  const { data: u } = await admin.auth.getUser(token);
  if (!u?.user) return json({ error: "Unauthorized" }, 401);

  // Only the merchant owner manages staff.
  const { data: merchant } = await admin.from("merchants").select("id").eq("user_id", u.user.id).maybeSingle();
  if (!merchant) return json({ error: "Only the business owner can manage staff" }, 403);

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  if (action === "create") {
    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    if (!name || name.length > 80) return json({ error: "Enter the staff member's name" }, 400);
    if (!PHONE_RE.test(phone)) return json({ error: "Phone must be 10 digits starting with 0" }, 400);
    if (!PIN_RE.test(String(body.pin))) return json({ error: "PIN must be 4 digits" }, 400);
    if (!ROLES.includes(body.role)) return json({ error: "Invalid role" }, 400);

    const login = await createLogin(phone, String(body.pin));
    if (!login.id) return json({ error: login.error }, 409);
    const { error } = await admin.from("merchant_staff")
      .insert({ merchant_id: merchant.id, name, phone, role: body.role, user_id: login.id });
    if (error) {
      await admin.auth.admin.deleteUser(login.id);
      return json({ error: "Could not add staff" }, 400);
    }
    return json({ created: true });
  }

  const { data: staff } = await admin.from("merchant_staff").select("*")
    .eq("id", String(body.id ?? "")).eq("merchant_id", merchant.id).maybeSingle();
  if (!staff) return json({ error: "Staff member not found" }, 404);

  if (action === "update") {
    const patch: Record<string, unknown> = {};
    if (body.role !== undefined) {
      if (!ROLES.includes(body.role)) return json({ error: "Invalid role" }, 400);
      patch.role = body.role;
    }
    if (body.is_active !== undefined) patch.is_active = !!body.is_active;

    let userId = staff.user_id as string | null;
    if (body.pin !== undefined) {
      if (!PIN_RE.test(String(body.pin))) return json({ error: "PIN must be 4 digits" }, 400);
      if (userId) {
        const { error } = await admin.auth.admin.updateUserById(userId, { password: pinToPassword(String(body.pin)) });
        if (error) return json({ error: "Could not change PIN" }, 500);
      } else {
        // Legacy staff row without a login yet.
        const login = await createLogin(staff.phone, String(body.pin));
        if (!login.id) return json({ error: login.error }, 409);
        userId = login.id;
        patch.user_id = userId;
      }
    }
    if (userId && body.is_active !== undefined) {
      await admin.auth.admin.updateUserById(userId, { ban_duration: body.is_active ? "none" : BAN_FOREVER });
    }
    if (Object.keys(patch).length) await admin.from("merchant_staff").update(patch).eq("id", staff.id);
    return json({ updated: true });
  }

  if (action === "delete") {
    if (staff.user_id) await admin.auth.admin.deleteUser(staff.user_id);
    await admin.from("merchant_staff").delete().eq("id", staff.id);
    return json({ deleted: true });
  }

  return json({ error: "Unknown action" }, 400);
});
