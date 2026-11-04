import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const env = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server environment variable: ${name}`);
  return value;
};
const adminDb = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});
async function authenticatedUser(req: Request) {
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) throw new Error("Sign in is required");
  const client = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Invalid or expired session");
  return data.user;
}
async function phonepeToken() {
  const production = Deno.env.get("PHONEPE_ENV") === "production";
  const base = production ? "https://api.phonepe.com/apis/pg" : "https://api-preprod.phonepe.com/apis/pg-sandbox";
  const authBase = production ? "https://api.phonepe.com/apis/identity-manager" : "https://api-preprod.phonepe.com/apis/pg-sandbox";
  const form = new URLSearchParams({
    client_id: env("PHONEPE_CLIENT_ID"),
    client_version: env("PHONEPE_CLIENT_VERSION"),
    client_secret: env("PHONEPE_CLIENT_SECRET"),
    grant_type: "client_credentials",
  });
  const response = await fetch(`${authBase}/v1/oauth/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form,
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) {
    console.error("PhonePe OAuth failed", response.status);
    throw new Error("PhonePe authorization failed");
  }
  return { token: result.access_token as string, base };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const user = await authenticatedUser(req);
    const body = await req.json();
    const planId = body?.planId;
    if (typeof planId !== "string" || !/^[0-9a-f-]{36}$/i.test(planId)) return json({ error: "A valid planId is required" }, 400);

    const db = adminDb();
    const { data: plan, error: planError } = await db.from("plans")
      .select("id,name,price_inr,duration_days").eq("id", planId).maybeSingle();
    if (planError || !plan || !Number.isSafeInteger(plan.price_inr) || plan.price_inr <= 0) return json({ error: "Plan not found or unavailable" }, 404);

    const metadata = user.user_metadata ?? {};
    const displayName = String(metadata.full_name ?? metadata.name ?? user.email ?? "VPN Customer").slice(0, 100);
    const { data: existing } = await db.from("customers").select("id").eq("auth_user_id", user.id).maybeSingle();
    let customerId = existing?.id as string | undefined;
    if (!customerId) {
      const { data: customer, error } = await db.from("customers").insert({
        auth_user_id: user.id, name: displayName, email: user.email ?? null, active: false, plan_id: null,
      }).select("id").single();
      if (error || !customer) throw new Error("Could not create customer profile");
      customerId = customer.id;
    }

    const orderReference = `JBVPN${crypto.randomUUID().replaceAll("-", "").slice(0, 20).toUpperCase()}`;
    const { data: order, error: orderError } = await db.from("payment_orders").insert({
      order_reference: orderReference, customer_id: customerId, plan_id: plan.id,
      amount_inr: plan.price_inr, currency: "INR", provider: "phonepe", status: "pending",
    }).select("id,expires_at").single();
    if (orderError || !order) throw new Error("Could not create PhonePe payment order");

    try {
      const { token, base } = await phonepeToken();
      const appBase = env("APP_BASE_URL").replace(/\/$/, "");
      const response = await fetch(`${base}/checkout/v2/pay`, {
        method: "POST",
        headers: { Authorization: `O-Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantOrderId: orderReference,
          amount: plan.price_inr * 100,
          expireAfter: 1200,
          metaInfo: { udf1: orderReference, udf2: user.id, udf3: plan.id },
          paymentFlow: {
            type: "PG_CHECKOUT",
            message: `JB Pocket VPN - ${plan.name}`,
            merchantUrls: { redirectUrl: `${appBase}/pricing?payment=processing&orderReference=${encodeURIComponent(orderReference)}` },
          },
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.redirectUrl) {
        console.error("PhonePe checkout creation failed", response.status);
        throw new Error("PhonePe could not create checkout");
      }
      return json({ orderReference, amountInr: plan.price_inr, currency: "INR", redirectUrl: result.redirectUrl, expiresAt: order.expires_at, paymentStatus: "pending", verification: "phonepe_server_webhook" });
    } catch (error) {
      await db.from("payment_orders").delete().eq("id", order.id).eq("status", "pending");
      throw error;
    }
  } catch (error) {
    console.error("create-phonepe-order error", error);
    return json({ error: error instanceof Error ? error.message : "Could not create PhonePe order" }, 400);
  }
});
