import { createClient } from "@supabase/supabase-js";

const corsHeaders = { "content-type": "application/json", "cache-control": "no-store" };

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const username = Deno.env.get("PHONEPE_WEBHOOK_USERNAME");
  const password = Deno.env.get("PHONEPE_WEBHOOK_PASSWORD");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!username || !password || !supabaseUrl || !serviceKey) {
    console.error("PhonePe webhook secrets are not configured");
    return json(503, { error: "webhook_not_configured" });
  }

  const auth = req.headers.get("authorization") ?? "";
  const expected = "Basic " + btoa(username + ":" + password);
  if (!safeEqual(auth, expected)) return json(401, { error: "unauthorized" });

  let event: any;
  try { event = await req.json(); } catch { return json(400, { error: "invalid_json" }); }

  const payload = event?.payload ?? event?.data ?? {};
  const state = String(payload?.state ?? payload?.paymentState ?? payload?.status ?? "").toUpperCase();
  const eventName = String(event?.event ?? event?.type ?? "").toLowerCase();

  // Only accept final successful payment notifications. Pending/failed callbacks never activate access.
  if (!(state === "COMPLETED" || state === "SUCCESS") ||
      (eventName && !eventName.includes("completed") && !eventName.includes("success"))) {
    return json(200, { received: true, ignored: true });
  }

  const merchantOrderId = String(payload?.merchantOrderId ?? payload?.merchant_order_id ?? payload?.orderReference ?? "");
  const details = Array.isArray(payload?.paymentDetails) ? payload.paymentDetails[0] : payload?.paymentDetails;
  const transactionId = String(details?.transactionId ?? details?.transaction_id ?? payload?.transactionId ?? payload?.providerReferenceId ?? "");
  const amountPaise = Number(payload?.amount ?? details?.amount);
  if (!merchantOrderId || !transactionId || !Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
    return json(400, { error: "missing_order_transaction_or_amount" });
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: order, error: lookupError } = await supabase
    .from("payment_orders")
    .select("id, amount_inr, status, provider")
    .eq("order_reference", merchantOrderId)
    .maybeSingle();

  if (lookupError) {
    console.error("PhonePe order lookup failed", lookupError.message);
    return json(500, { error: "order_lookup_failed" });
  }
  if (!order) return json(404, { error: "order_not_found" });
  if (order.provider !== "phonepe") return json(409, { error: "wrong_payment_provider" });
  if (Number(order.amount_inr) * 100 !== amountPaise) return json(409, { error: "amount_mismatch" });

  const { data: subscriptionId, error: activationError } = await supabase.rpc("confirm_paid_order", {
    p_order_id: order.id,
    p_provider_payment_id: transactionId,
  });
  if (activationError) {
    console.error("PhonePe payment activation failed", activationError.message);
    return json(500, { error: "payment_activation_failed" });
  }

  return json(200, { received: true, activated: true, subscription_id: subscriptionId });
});
