import { adminDb, corsHeaders, json, phonepeOrderStatus, verifyPhonePeWebhook } from "../_shared/phonepe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const rawBody = await req.text();
    if (!await verifyPhonePeWebhook(req, rawBody)) return json({ error: "Invalid webhook authentication" }, 401);

    const eventBody = JSON.parse(rawBody);
    const event = String(eventBody.event ?? "");
    const merchantOrderId = String(eventBody.payload?.merchantOrderId ?? eventBody.payload?.originalMerchantOrderId ?? "");
    if (!merchantOrderId) return json({ error: "Missing merchant order reference" }, 400);
    if (!["checkout.order.completed", "checkout.order.failed", "pg.refund.completed"].includes(event)) {
      return json({ received: true, ignored: true });
    }

    const db = adminDb();
    const { data: order, error } = await db.from("payment_orders")
      .select("id,order_reference,amount_inr,status,provider")
      .eq("order_reference", merchantOrderId).eq("provider", "phonepe").maybeSingle();
    if (error || !order) return json({ error: "Unknown payment order" }, 404);

    // Independently query PhonePe's authenticated order-status API. Never activate
    // from webhook JSON alone, redirect URLs, screenshots or client callbacks.
    const verified = await phonepeOrderStatus(merchantOrderId);
    if (verified.state === "COMPLETED") {
      if (Number(verified.amount) !== order.amount_inr * 100) {
        return json({ error: "Payment amount mismatch" }, 409);
      }
      const paymentId = String(
        verified.paymentDetails?.find((p: { state?: string }) => p.state === "COMPLETED")?.transactionId ??
        verified.orderId ?? "",
      );
      if (!paymentId) return json({ error: "PhonePe transaction ID missing" }, 409);

      const eventId = String(eventBody.payload?.orderId ?? verified.orderId ?? merchantOrderId);
      const { error: eventError } = await db.from("payment_webhook_events").insert({
        provider: "phonepe", provider_event_id: eventId, processed_at: new Date().toISOString(),
      });
      if (eventError && !String(eventError.code).includes("23505")) {
        throw new Error("Could not record webhook event");
      }
      const { error: activationError } = await db.rpc("confirm_paid_order", {
        p_order_id: order.id,
        p_provider_payment_id: paymentId,
      });
      if (activationError) throw new Error("Verified payment could not activate subscription");
    } else if (event === "pg.refund.completed" && verified.state !== "COMPLETED") {
      await db.from("payment_orders").update({ status: "refunded" }).eq("id", order.id);
    } else if (event === "checkout.order.failed" && verified.state === "FAILED" && order.status === "pending") {
      await db.from("payment_orders").update({ status: "failed" }).eq("id", order.id);
    }
    return json({ received: true });
  } catch (error) {
    console.error("phonepe-webhook error", error);
    return json({ error: "Webhook processing failed" }, 500);
  }
});
