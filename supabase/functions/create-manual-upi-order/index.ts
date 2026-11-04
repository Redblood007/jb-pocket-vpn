import { adminDb, authenticatedUser, corsHeaders, env, json } from "../_shared/phonepe.ts";
import { buildUpiIntent } from "../_shared/upi.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const user = await authenticatedUser(req);
    const body = await req.json();
    const planId = body?.planId;
    if (typeof planId !== "string" || !/^[0-9a-f-]{36}$/i.test(planId)) {
      return json({ error: "A valid planId is required" }, 400);
    }

    const db = adminDb();
    const { data: plan, error: planError } = await db.from("plans")
      .select("id,name,price_inr,duration_days")
      .eq("id", planId).maybeSingle();
    if (planError || !plan || !Number.isSafeInteger(plan.price_inr) || plan.price_inr <= 0) {
      return json({ error: "Plan not found or unavailable" }, 404);
    }

    const metadata = user.user_metadata ?? {};
    const displayName = String(metadata.full_name ?? metadata.name ?? user.email ?? "VPN Customer").slice(0, 100);
    const { data: existing } = await db.from("customers")
      .select("id").eq("auth_user_id", user.id).maybeSingle();
    let customerId = existing?.id as string | undefined;
    if (!customerId) {
      const { data: customer, error } = await db.from("customers").insert({
        auth_user_id: user.id,
        name: displayName,
        email: user.email ?? null,
        active: false,
        plan_id: null,
      }).select("id").single();
      if (error || !customer) throw new Error("Could not create customer profile");
      customerId = customer.id;
    }

    const orderReference = `JBVPN${crypto.randomUUID().replaceAll("-", "").slice(0, 20).toUpperCase()}`;
    const { data: order, error: orderError } = await db.from("payment_orders").insert({
      order_reference: orderReference,
      customer_id: customerId,
      plan_id: plan.id,
      amount_inr: plan.price_inr,
      currency: "INR",
      provider: "manual",
      status: "pending",
    }).select("id,order_reference,amount_inr,expires_at").single();
    if (orderError || !order) throw new Error("Could not create payment order");

    const upiUri = buildUpiIntent({
      vpa: env("UPI_MERCHANT_VPA"),
      payeeName: env("UPI_MERCHANT_NAME"),
      amountInr: plan.price_inr,
      orderReference,
    });

    return json({
      orderReference,
      amountInr: plan.price_inr,
      currency: "INR",
      upiId: env("UPI_MERCHANT_VPA"),
      payeeName: env("UPI_MERCHANT_NAME"),
      upiUri,
      expiresAt: order.expires_at,
      paymentStatus: "pending",
      verification: "manual_admin_review",
    });
  } catch (error) {
    console.error("create-manual-upi-order error", error);
    return json({ error: error instanceof Error ? error.message : "Could not create UPI order" }, 400);
  }
});
