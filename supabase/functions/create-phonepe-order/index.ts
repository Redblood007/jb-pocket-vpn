import { adminDb, authenticatedUser, corsHeaders, env, json, phonepeToken } from "../_shared/phonepe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const user = await authenticatedUser(req);
    const { planId } = await req.json();
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

    const orderReference = `JBVPN${crypto.randomUUID().replaceAll("-", "").slice(0, 24).toUpperCase()}`;
    const { data: order, error: orderError } = await db.from("payment_orders").insert({
      order_reference: orderReference,
      customer_id: customerId,
      plan_id: plan.id,
      amount_inr: plan.price_inr,
      currency: "INR",
      provider: "phonepe",
      status: "pending",
    }).select("id,order_reference,amount_inr").single();
    if (orderError || !order) throw new Error("Could not create payment order");

    const { token, base } = await phonepeToken();
    const siteUrl = env("APP_BASE_URL").replace(/\/$/, "");
    const response = await fetch(`${base}/checkout/v2/pay`, {
      method: "POST",
      headers: { Authorization: `O-Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        merchantOrderId: orderReference,
        amount: plan.price_inr * 100,
        expireAfter: 1200,
        paymentFlow: {
          type: "PG_CHECKOUT",
          merchantUrls: { redirectUrl: `${siteUrl}/payment-return?order=${encodeURIComponent(orderReference)}` },
        },
        metaInfo: { udf1: customerId, udf2: plan.id, udf3: "jb-pocket-vpn" },
      }),
    });
    const checkout = await response.json();
    if (!response.ok || !checkout.redirectUrl) {
      console.error("PhonePe create payment failed", response.status);
      await db.from("payment_orders").update({ status: "failed" }).eq("id", order.id);
      return json({ error: "PhonePe could not start checkout" }, 502);
    }

    await db.from("payment_orders")
      .update({ checkout_url: checkout.redirectUrl, updated_at: new Date().toISOString() })
      .eq("id", order.id);
    return json({
      orderReference,
      amountInr: plan.price_inr,
      checkoutUrl: checkout.redirectUrl,
      expiresAt: checkout.expireAt ?? null,
    });
  } catch (error) {
    console.error("create-phonepe-order error", error);
    return json({ error: error instanceof Error ? error.message : "Checkout failed" }, 400);
  }
});
