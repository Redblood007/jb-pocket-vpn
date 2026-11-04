import { adminDb, authenticatedUser, corsHeaders, json } from "../_shared/phonepe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const user = await authenticatedUser(req);
    const { orderReference, utrReference } = await req.json();
    if (typeof orderReference !== "string" || typeof utrReference !== "string" ||
        utrReference.trim().length < 8 || utrReference.trim().length > 64) {
      return json({ error: "Enter the order reference and a valid UPI transaction reference" }, 400);
    }

    const db = adminDb();
    const { data: order, error: orderError } = await db.from("payment_orders")
      .select("id,customer_id,status,expires_at")
      .eq("order_reference", orderReference)
      .eq("provider", "manual")
      .maybeSingle();
    if (orderError || !order || order.status !== "pending" || new Date(order.expires_at) <= new Date()) {
      return json({ error: "Pending UPI order not found or expired" }, 404);
    }

    const { data: customer, error: customerError } = await db.from("customers")
      .select("auth_user_id").eq("id", order.customer_id).maybeSingle();
    if (customerError || customer?.auth_user_id !== user.id) {
      return json({ error: "This payment order does not belong to your account" }, 403);
    }

    const { error: updateError } = await db.from("payment_orders")
      .update({
        utr_reference: utrReference.trim().toUpperCase(),
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id).eq("status", "pending");
    if (updateError) {
      if (updateError.code === "23505") return json({ error: "This UPI reference has already been submitted" }, 409);
      throw updateError;
    }
    return json({ submitted: true, status: "pending_admin_verification" });
  } catch (error) {
    console.error("submit-manual-upi-reference error", error);
    return json({ error: error instanceof Error ? error.message : "Could not submit payment reference" }, 400);
  }
});
