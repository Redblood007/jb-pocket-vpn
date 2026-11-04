import { adminDb, authenticatedUser, corsHeaders, json, phonepeOrderStatus } from "../_shared/phonepe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const user = await authenticatedUser(req);
    const { orderReference } = await req.json();
    if (typeof orderReference !== "string") return json({ error: "orderReference is required" }, 400);
    const db = adminDb();
    const { data: customer } = await db.from("customers")
      .select("id").eq("auth_user_id", user.id).maybeSingle();
    if (!customer) return json({ error: "Customer profile not found" }, 404);
    const { data: order } = await db.from("payment_orders")
      .select("id,order_reference,status,amount_inr")
      .eq("customer_id", customer.id).eq("order_reference", orderReference)
      .eq("provider", "phonepe").maybeSingle();
    if (!order) return json({ error: "Order not found" }, 404);

    const status = await phonepeOrderStatus(orderReference);
    if (status.state === "COMPLETED" && Number(status.amount) === order.amount_inr * 100) {
      const paymentId = String(
        status.paymentDetails?.find((p: { state?: string }) => p.state === "COMPLETED")?.transactionId ??
        status.orderId ?? "",
      );
      if (paymentId && order.status !== "paid") {
        const { error } = await db.rpc("confirm_paid_order", {
          p_order_id: order.id, p_provider_payment_id: paymentId,
        });
        if (error) throw new Error("Payment verified but activation failed");
      }
    }
    return json({ orderReference, providerState: status.state, amountInr: order.amount_inr });
  } catch (error) {
    console.error("phonepe-payment-status error", error);
    return json({ error: error instanceof Error ? error.message : "Status check failed" }, 400);
  }
});
