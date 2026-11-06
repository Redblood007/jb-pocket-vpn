import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "null",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const env = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server environment variable: ${name}`);
  return value;
};
const base = () => {
  const mode = env("PHONEPE_ENV");
  if (mode === "UAT") return "https://api-preprod.phonepe.com/apis/pg-sandbox";
  if (mode === "PRODUCTION") return "https://api.phonepe.com/apis/pg";
  throw new Error("PHONEPE_ENV must be UAT or PRODUCTION");
};
async function token() {
  const form = new URLSearchParams({
    client_id: env("PHONEPE_CLIENT_ID"),
    client_version: env("PHONEPE_CLIENT_VERSION"),
    client_secret: env("PHONEPE_CLIENT_SECRET"),
    grant_type: "client_credentials",
  });
  const url = env("PHONEPE_ENV") === "UAT"
    ? "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token"
    : "https://api.phonepe.com/apis/identity-manager/v1/oauth/token";
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.access_token !== "string") throw new Error("PhonePe authorization failed");
  return data.access_token as string;
}
const adminDb = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const allowed = Deno.env.get("APP_ORIGIN");
  if (req.method === "OPTIONS") {
    if (origin && allowed && origin !== allowed) return new Response("Forbidden", { status: 403 });
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (origin && allowed && origin !== allowed) return json({ error: "Origin not allowed" }, 403);
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Sign in is required" }, 401);
    const userClient = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: auth, error: authError } = await userClient.auth.getUser();
    if (authError || !auth.user) return json({ error: "Invalid or expired session" }, 401);

    const body = await req.json().catch(() => null);
    const merchantOrderId = typeof body?.merchant_order_id === "string" ? body.merchant_order_id : "";
    if (!/^JKVPN_[a-f0-9]{32}$/i.test(merchantOrderId)) return json({ error: "Invalid merchant_order_id" }, 400);

    const db = adminDb();
    const { data: order, error: orderError } = await db.from("payment_orders")
      .select("id,order_reference,amount_inr,status,provider,provider_payment_id,customer:customers!inner(auth_user_id)")
      .eq("order_reference", merchantOrderId)
      .eq("provider", "phonepe")
      .eq("customer.auth_user_id", auth.user.id)
      .maybeSingle();
    if (orderError || !order) return json({ error: "Payment order not found" }, 404);
    if (order.status === "paid") return json({ status: "paid", verified: true });
    if (order.status !== "pending") return json({ status: order.status, verified: false });

    const accessToken = await token();
    const response = await fetch(`${base()}/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status`, {
      method: "GET",
      headers: { Authorization: `O-Bearer ${accessToken}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    const status = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("PhonePe status lookup failed", response.status);
      return json({ error: "Payment status is temporarily unavailable" }, 502);
    }

    if (status.merchantOrderId !== merchantOrderId || status.amount !== order.amount_inr * 100) {
      console.error("PhonePe status response did not match merchant order or amount");
      return json({ error: "Payment verification mismatch. Contact support." }, 409);
    }
    if (status.state === "COMPLETED") {
      const providerPaymentId = typeof status.orderId === "string" ? status.orderId : order.provider_payment_id;
      if (!providerPaymentId) return json({ error: "PhonePe response did not include a payment reference" }, 409);
      const { data: activated, error: activationError } = await db.rpc("activate_phonepe_subscription", {
        p_order_reference: merchantOrderId,
        p_provider_payment_id: providerPaymentId,
        p_paid_at: new Date().toISOString(),
      });
      if (activationError) {
        console.error("Subscription activation failed", activationError.message);
        return json({ error: "Payment is verified but activation needs support review" }, 500);
      }
      return json({ status: "paid", verified: true, subscription: activated });
    }
    if (status.state === "FAILED") {
      await db.from("payment_orders").update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", order.id).eq("status", "pending");
      return json({ status: "failed", verified: false });
    }
    return json({ status: "pending", verified: false });
  } catch (error) {
    console.error("verify-phonepe-payment failed", error instanceof Error ? error.message : "unknown error");
    return json({ error: "Could not verify payment. Please retry shortly." }, 500);
  }
});
