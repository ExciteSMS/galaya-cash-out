// ZRA Smart Invoice (VSDC) integration.
// Actions: init (device init), sale (transaction_id), credit_note (refund_id), retry (invoice_id)
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const Body = z.object({
  action: z.enum(["init", "sale", "credit_note", "retry"]),
  transaction_id: z.string().uuid().optional(),
  refund_id: z.string().uuid().optional(),
  invoice_id: z.string().uuid().optional(),
  merchant_id: z.string().uuid().optional(),
});

const TAX_RATES: Record<string, number> = { A: 16, B: 16, C1: 0, C2: 0, C3: 0, D: 0, E: 0 };

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const ymdhms = (d: Date) => `${ymd(d)}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
const r2 = (n: number) => Math.round(n * 100) / 100;

async function callVsdc(base: string, path: string, payload: unknown) {
  const url = `${base.replace(/\/+$/, "")}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) throw Object.assign(new Error(`VSDC HTTP ${res.status}: ${text.slice(0, 300)}`), { data });
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Auth: internal service call, or a signed-in admin / owning merchant
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const isInternal = token && token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  let callerMerchantId: string | null = null;
  let isAdmin = false;
  if (!isInternal) {
    if (!token) return json({ error: "Unauthorized" }, 401);
    const { data: u } = await supabase.auth.getUser(token);
    if (!u?.user) return json({ error: "Unauthorized" }, 401);
    const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    isAdmin = !!role;
    const { data: m } = await supabase.from("merchants").select("id").eq("user_id", u.user.id).maybeSingle();
    callerMerchantId = m?.id ?? null;
  }
  const canAct = (merchantId: string) => isInternal || isAdmin || callerMerchantId === merchantId;

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
  const body = parsed.data;

  try {
    const loadSettings = async (merchantId: string) => {
      const { data } = await supabase.from("merchant_zra_settings").select("*").eq("merchant_id", merchantId).maybeSingle();
      return data;
    };

    // ---------- INIT ----------
    if (body.action === "init") {
      const merchantId = body.merchant_id || callerMerchantId;
      if (!merchantId || !canAct(merchantId)) return json({ error: "Forbidden" }, 403);
      const s = await loadSettings(merchantId);
      if (!s?.vsdc_url || !s.tpin || !s.dvc_srl_no) return json({ error: "ZRA settings incomplete" }, 400);
      const resp = await callVsdc(s.vsdc_url, "/initializer/selectInitInfo", { tpin: s.tpin, bhfId: s.bhf_id, dvcSrlNo: s.dvc_srl_no });
      const ok = resp?.resultCd === "000" || resp?.resultCd === "902"; // 902 = already initialized
      if (ok) await supabase.from("merchant_zra_settings").update({ initialized_at: new Date().toISOString() }).eq("id", s.id);
      return json({ success: ok, resultCd: resp?.resultCd, message: resp?.resultMsg, data: resp?.data });
    }

    // ---------- Build / resolve invoice row ----------
    let invoiceRow: any = null;

    if (body.action === "retry") {
      if (!body.invoice_id) return json({ error: "invoice_id required" }, 400);
      const { data } = await supabase.from("zra_invoices").select("*").eq("id", body.invoice_id).single();
      if (!data) return json({ error: "Invoice not found" }, 404);
      if (!canAct(data.merchant_id)) return json({ error: "Forbidden" }, 403);
      if (data.status === "success") return json({ success: true, invoice: data });
      invoiceRow = data;
    } else if (body.action === "sale") {
      if (!body.transaction_id) return json({ error: "transaction_id required" }, 400);
      const { data: existing } = await supabase.from("zra_invoices").select("*").eq("transaction_id", body.transaction_id).eq("invoice_type", "sale").maybeSingle();
      if (existing?.status === "success") return json({ success: true, invoice: existing });
      const { data: tx } = await supabase.from("transactions").select("*").eq("id", body.transaction_id).single();
      if (!tx) return json({ error: "Transaction not found" }, 404);
      if (!canAct(tx.merchant_id)) return json({ error: "Forbidden" }, 403);
      if (tx.status !== "success" && tx.status !== "refunded") return json({ error: "Transaction not successful" }, 400);
      invoiceRow = existing;
      if (!invoiceRow) {
        const s = await loadSettings(tx.merchant_id);
        if (!s?.enabled) return json({ skipped: true, reason: "ZRA disabled for merchant" });
        const { data: last } = await supabase.from("zra_invoices").select("invoice_no").eq("merchant_id", tx.merchant_id).order("invoice_no", { ascending: false }).limit(1).maybeSingle();
        const { data: ins, error } = await supabase.from("zra_invoices").insert({
          merchant_id: tx.merchant_id, transaction_id: tx.id, invoice_type: "sale",
          invoice_no: (last?.invoice_no ?? 0) + 1, amount: Number(tx.amount) + Number(tx.tip_amount || 0),
        }).select().single();
        if (error) throw error;
        invoiceRow = ins;
      }
    } else if (body.action === "credit_note") {
      if (!body.refund_id) return json({ error: "refund_id required" }, 400);
      const { data: existing } = await supabase.from("zra_invoices").select("*").eq("refund_id", body.refund_id).maybeSingle();
      if (existing?.status === "success") return json({ success: true, invoice: existing });
      const { data: rf } = await supabase.from("refunds").select("*").eq("id", body.refund_id).single();
      if (!rf) return json({ error: "Refund not found" }, 404);
      if (!canAct(rf.merchant_id)) return json({ error: "Forbidden" }, 403);
      if (rf.status !== "approved") return json({ error: "Refund not approved" }, 400);
      invoiceRow = existing;
      if (!invoiceRow) {
        const s = await loadSettings(rf.merchant_id);
        if (!s?.enabled) return json({ skipped: true, reason: "ZRA disabled for merchant" });
        const { data: last } = await supabase.from("zra_invoices").select("invoice_no").eq("merchant_id", rf.merchant_id).order("invoice_no", { ascending: false }).limit(1).maybeSingle();
        const { data: ins, error } = await supabase.from("zra_invoices").insert({
          merchant_id: rf.merchant_id, transaction_id: rf.transaction_id, refund_id: rf.id, invoice_type: "credit_note",
          invoice_no: (last?.invoice_no ?? 0) + 1, amount: Number(rf.amount),
        }).select().single();
        if (error) throw error;
        invoiceRow = ins;
      }
    }

    // ---------- Submit to VSDC ----------
    const s = await loadSettings(invoiceRow.merchant_id);
    if (!s?.vsdc_url || !s.tpin || !s.dvc_srl_no) {
      await supabase.from("zra_invoices").update({ status: "failed", error: "ZRA settings incomplete", updated_at: new Date().toISOString() }).eq("id", invoiceRow.id);
      return json({ success: false, error: "ZRA settings incomplete" }, 400);
    }

    const isCredit = invoiceRow.invoice_type === "credit_note";
    let orgInvcNo = 0;
    if (isCredit && invoiceRow.transaction_id) {
      const { data: orig } = await supabase.from("zra_invoices").select("invoice_no").eq("transaction_id", invoiceRow.transaction_id).eq("invoice_type", "sale").maybeSingle();
      orgInvcNo = orig?.invoice_no ?? 0;
    }

    const { data: tx } = invoiceRow.transaction_id
      ? await supabase.from("transactions").select("phone, created_at").eq("id", invoiceRow.transaction_id).maybeSingle()
      : { data: null };

    const taxTy = s.tax_type || "A";
    const rate = TAX_RATES[taxTy] ?? 16;
    const total = r2(Number(invoiceRow.amount));
    const taxAmt = r2((total * rate) / (100 + rate));
    const now = new Date();
    const salesDate = tx?.created_at ? new Date(tx.created_at) : now;

    const taxbl: Record<string, number> = {}; const taxR: Record<string, number> = {}; const taxA: Record<string, number> = {};
    for (const k of ["A", "B", "C1", "C2", "C3", "D", "E", "Rvat", "IPL1", "IPL2", "TL", "ECM", "EXEEG", "TOT"]) {
      taxbl[`taxblAmt${k}`] = k === taxTy ? total : 0;
      taxR[`taxRt${k}`] = TAX_RATES[k] ?? 0;
      taxA[`taxAmt${k}`] = k === taxTy ? taxAmt : 0;
    }

    const payload = {
      tpin: s.tpin, bhfId: s.bhf_id,
      orgInvcNo,
      cisInvcNo: `GLY${invoiceRow.invoice_no}`,
      custTpin: null, custNm: tx?.phone || "Customer",
      salesTyCd: "N",
      rcptTyCd: isCredit ? "R" : "S",
      pmtTyCd: "07", // mobile money
      salesSttsCd: "02",
      cfmDt: ymdhms(now),
      salesDt: ymd(salesDate),
      stockRlsDt: null, cnclReqDt: null, cnclDt: null, rfdDt: isCredit ? ymdhms(now) : null,
      rfdRsnCd: isCredit ? "01" : null,
      totItemCnt: 1,
      ...taxbl, ...taxR, ...taxA,
      totTaxblAmt: total, totTaxAmt: taxAmt, totAmt: total,
      prchrAcptcYn: "N", remark: null,
      regrId: "galaya", regrNm: "Galaya POS", modrId: "galaya", modrNm: "Galaya POS",
      saleCtyCd: "1", lpoNumber: null, currencyTyCd: "ZMW", exchangeRt: "1", destnCountryCd: "",
      dbtRsnCd: "", invcAdjustReason: "",
      itemList: [{
        itemSeq: 1, itemCd: "GLYSVC0001", itemClsCd: "50102517", itemNm: isCredit ? "Refund" : "Sale",
        bcd: null, pkgUnitCd: "NT", pkg: 1, qtyUnitCd: "U", qty: 1, prc: total, splyAmt: total,
        dcRt: 0, dcAmt: 0, isrccCd: null, isrccNm: null, isrcRt: null, isrcAmt: null,
        vatCatCd: taxTy, exciseTxCatCd: null, vatTaxblAmt: total, vatAmt: taxAmt, exciseTaxblAmt: 0,
        tlCatCd: null, tlTaxblAmt: 0, tlAmt: 0, iplCatCd: null, iplTaxblAmt: 0, iplAmt: 0,
        taxblAmt: total, taxAmt, totAmt: total,
      }],
    };

    let resp: any = null; let errMsg: string | null = null;
    try {
      resp = await callVsdc(s.vsdc_url, "/trnsSales/saveSales", payload);
      if (resp?.resultCd !== "000") errMsg = `${resp?.resultCd || "?"}: ${resp?.resultMsg || "VSDC rejected invoice"}`;
    } catch (e: any) {
      errMsg = e.message; resp = e.data ?? null;
    }

    const d = resp?.data || {};
    const update = {
      status: errMsg ? "failed" : "success",
      error: errMsg,
      attempts: (invoiceRow.attempts || 0) + 1,
      tax_amount: taxAmt,
      request: payload, response: resp,
      rcpt_no: d.rcptNo != null ? String(d.rcptNo) : null,
      sdc_id: d.sdcId ?? null, mrc_no: d.mrcNo ?? null,
      rcpt_sign: d.rcptSign ?? null, intrl_data: d.intrlData ?? null,
      qr_url: d.qrCodeUrl ?? null,
      updated_at: new Date().toISOString(),
    };
    const { data: saved } = await supabase.from("zra_invoices").update(update).eq("id", invoiceRow.id).select().single();
    if (errMsg) console.error("ZRA submit failed:", errMsg);
    return json({ success: !errMsg, error: errMsg, invoice: saved }, errMsg ? 502 : 200);
  } catch (e: any) {
    console.error("zra-invoice error:", e);
    return json({ error: e.message || "Internal error" }, 500);
  }
});
