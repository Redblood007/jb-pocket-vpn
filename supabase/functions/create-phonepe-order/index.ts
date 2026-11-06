import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "null",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const requiredEnv = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server environment variable: ${name}`);
  return value;
};
const phonePeBase = () => {
  const env = requiredEnv("PHONEPE_ENV");
  if (env === "UAT") return "https://api-preprod.phonepe.com/apis/pg-sandbox";
  if (env === "PRODUCTION") return "https://api.phonepe.com/apis/pg";
  throw new Error("PHONEPE_ENV must be UAT or PRODUCTION");
};
const adminDb = () => createClient(
  requiredEnv("SUPABASE_URL"),
  requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function getPhonePeToken() {
  const form = new URLSearchParams({
    client_id: requiredEnv("PHONEPE_CLIENT_ID"),
    client_version: requiredEnv("PHONEPE_CLIENT_VERSION"),
    client_secret: requiredEnv("PHONEPE_CLIENT_SECRET"),
    grant_type: "client_credentials",
  });
  const tokenUrl = requiredEnv("PHONEPE_ENV") === "UAT"\n    ? "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token"\n    : "https://api.phonepe.com/apis/identity-manager/v1/oauth/token";\n  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
    signal: AbortSignal.timeout(10000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.access_token !== "string") {
    console.error("PhonePe token request failed", response.status);
    throw new Error("PhonePe authorization failed");
  }
  return payload.access_token as string;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const allowedOrigin = Deno.env.get("APP_ORIGIN");
  if (req.method === "OPTIONS") {
    if (origin && allowedOrigin && origin !== allowedOrigin) return new Response("Forbidden", { status: 403 });
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (origin && allowedOrigin && origin !== allowedOrigin) return json({ error: "Origin not allowed" }, 403);

  let createdOrderId: string | null = null;
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Sign in is required" }, 401);
    const userClient = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json({ error: "Invalid or expired session" }, 401);

    const body = await req.json().catch(() => null);
    const planId = typeof body?.plan_id === "string" ? body.plan_id : "";
    if (!/^[0-9a-f-]{36}$/i.test(planId)) return json({ error: "A valid plan_id is required" }, 400);

    const db = adminDb();
    const [{ data: plan, error: planError }, { data: profile }] = await Promise.all([
      db.from("plans").select("id,slug,name,price_inr,duration_days").eq("id", planId).maybeSingle(),
      db.from("customer_profiles").select("name,email").eq("user_id", authData.user.id).maybeSingle(),
    ]);
    if (planError || !plan) return json({ error: "Selected plan was not found" }, 404);
    if (plan.slug === "free" || !Number.isInteger(plan.price_inr) || plan.price_inr < 1) {
      return json({ error: "This plan does not require a paid checkout" }, 400);
    }
    if (!Number.isInteger(plan.duration_days) || plan.duration_days < 1) {
      return json({ error: "The selected plan has invalid billing duration" }, 409);
    }

    let { data: customer, error: customerError } = await db.from("customers")
      .select("id,active").eq("auth_user_id", authData.user.id).maybeSingle();
    if (customerError) throw new Error("Could not load customer account");
    if (!customer) {
      const displayName = profile?.name || authData.user.user_metadata?.full_name ||
        authData.user.email?.split("@")[0] || "VPN customer";
      const { data: newCustomer, error } = await db.from("customers").insert({
        auth_user_id: authData.user.id,
        name: String(displayName).slice(0, 120),
        email: profile?.email || authData.user.email || null,
        active: true,
      }).select("id,active").single();
      if (error || !newCustomer) throw new Error("Could not create customer account");
      customer = newCustomer;
    }
    if (!customer.active) return json({ error: "Your account is inactive. Contact support." }, 403);

    const merchantOrderId = `JKVPN_${crypto.randomUUID().replaceAll("-", "")}`;
    const amountPaise = plan.price_inr * 100;
    if (!Number.isSafeInteger(amountPaise) || amountPaise < 100) {
      return json({ error: "The plan price is outside PhonePe's supported range" }, 400);
    }
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    const { data: order, error: insertError } = await db.from("payment_orders").insert({
      order_reference: merchantOrderId,
      customer_id: customer.id,
      plan_id: plan.id,
      amount_inr: plan.price_inr,
      currency: "INR",
      status: "pending",
      provider: "phonepe",
      expires_at: expiresAt,
    }).select("id").single();
    if (insertError || !order) throw new Error("Could not create payment order");
    createdOrderId = order.id;

    const base = phonePeBase();
    const token = await getPhonePeToken();
    const appOrigin = requiredEnv("APP_ORIGIN").replace(/\/$/, "");
    const response = await fetch(`${base}/checkout/v2/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `O-Bearer ${token}`,
      },
      body: JSON.stringify({
        merchantOrderId,
        amount: amountPaise,
        expireAfter: 1200,
        paymentFlow: {
          type: "PG_CHECKOUT",
          message: `JK Pocket VPN — ${plan.name}`,
          merchantUrls: {
            redirectUrl: `${appOrigin}/?payment=return&order=${encodeURIComponent(merchantOrderId)}`,
          },
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    const checkout = await response.json().catch(() => ({}));
    if (!response.ok || typeof checkout.redirectUrl !== "string" || typeof checkout.orderId !== "string") {
      console.error("PhonePe create checkout failed", response.status);
      await db.from("payment_orders").update({ status: "failed" }).eq("id", order.id);
      return json({ error: "PhonePe could not start checkout. Please try again." }, 502);
    }

    const { error: updateError } = await db.from("payment_orders")
      .update({ provider_payment_id: checkout.orderId }).eq("id", order.id);
    if (updateError) {
      console.error("Could not persist PhonePe provider order ID");
      return json({ error: "Checkout was created but could not be linked to your order. Contact support." }, 500);
    }

    return json({
      merchant_order_id: merchantOrderId,
      checkout_url: checkout.redirectUrl,
      amount_inr: plan.price_inr,
      currency: "INR",
    });
  } catch (error) {
    console.error("create-phonepe-order failed", error instanceof Error ? error.message : "unknown error");
    if (createdOrderId) {
      try {
        await adminDb().from("payment_orders").update({ status: "failed" }).eq("id", createdOrderId);
      } catch { /* preserve the original failure */ }
    }
    return json({ error: "Could not create PhonePe checkout. Check server configuration and try again." }, 500);
  }
});
