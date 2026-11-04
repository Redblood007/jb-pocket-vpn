import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type Plan = Database["public"]["Tables"]["plans"]["Row"];
export type Customer = Database["public"]["Tables"]["customers"]["Row"];

/** Public plan list for the homepage — anonymous, publishable client only. */
export const listPublicPlans = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const supabasePublic = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Opaque sb_ keys aren't JWTs; send only apikey, not the default Authorization bearer.
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await supabasePublic.from("plans").select("*").order("sort_order");
  if (error) throw new Error(error.message);
  return data;
});

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export const listAdminData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as never as {
      supabase: any;
      userId: string;
    };
    await assertAdmin(supabase, userId);
    const [customers, plans, payments] = await Promise.all([
      supabase.from("customers").select("*").order("created_at", { ascending: false }),
      supabase.from("plans").select("*").order("sort_order"),
      supabase.from("payment_orders").select("id,user_id,amount_inr,upi_reference,status,created_at,expires_at").order("created_at", { ascending: false }),
    ]);
    if (customers.error) throw new Error(customers.error.message);
    if (plans.error) throw new Error(plans.error.message);
    if (payments.error && !["42P01", "PGRST205"].includes(payments.error.code)) throw new Error(payments.error.message);
    return { customers: customers.data as Customer[], plans: plans.data as Plan[], payments: payments.data ?? [] };
  });

export type NewCustomer = {
  name: string;
  phone?: string;
  email?: string;
  plan_id?: string | null;
  vpn_username?: string;
  vpn_password?: string;
  started_on?: string;
  notes?: string;
};

export const createCustomer = createServerFn({ method: "POST" })
  .inputValidator((input: NewCustomer) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as never as { supabase: any; userId: string };
    await assertAdmin(supabase, userId);
    const { error } = await supabase.from("customers").insert({
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      plan_id: data.plan_id || null,
      vpn_username: data.vpn_username || null,
      vpn_password: data.vpn_password || null,
      started_on: data.started_on || undefined,
      notes: data.notes || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCustomer = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as never as { supabase: any; userId: string };
    await assertAdmin(supabase, userId);
    const { error } = await supabase.from("customers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setCustomerActive = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; active: boolean }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as never as { supabase: any; userId: string };
    await assertAdmin(supabase, userId);
    const { error } = await supabase.from("customers").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type PlanUpdate = {
  id: string;
  name: string;
  price_inr: number;
  devices: number;
  popular: boolean;
  features: string[];
};

export const updatePlan = createServerFn({ method: "POST" })
  .inputValidator((input: PlanUpdate) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as never as { supabase: any; userId: string };
    await assertAdmin(supabase, userId);
    const { error } = await supabase
      .from("plans")
      .update({
        name: data.name,
        price_inr: data.price_inr,
        devices: data.devices,
        popular: data.popular,
        features: data.features,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


/**
 * Creates a pending UPI intent for the signed-in customer.
 * This does NOT verify payment. Only a trusted gateway webhook or admin review
 * may transition an order to "paid".
 */
export const createPendingUpiOrder = createServerFn({ method: "POST" })
  .inputValidator((input: { planId: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as never as { supabase: any; userId: string };
    if (!/^[0-9a-f-]{36}$/i.test(data.planId)) throw new Error("Invalid plan");
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("id,name,price_inr")
      .eq("id", data.planId)
      .maybeSingle();
    if (planError || !plan) throw new Error("Selected plan is unavailable");

    const reference = `JBVPN-${globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
    const { error: insertError } = await supabase.from("payment_orders").insert({
      user_id: userId,
      plan_id: plan.id,
      amount_inr: plan.price_inr,
      upi_reference: reference,
      status: "pending",
      provider: "upi_intent",
    });
    if (insertError) throw new Error("Could not create payment order: " + insertError.message);

    const params = new URLSearchParams({
      pa: "7006269882@ybl",
      pn: "JB Pocket VPN",
      am: String(plan.price_inr),
      cu: "INR",
      tn: `${plan.name} VPN subscription ${reference}`,
      tr: reference,
    });
    return {
      reference,
      amountInr: plan.price_inr,
      upiUrl: `upi://pay?${params.toString()}`,
      status: "pending" as const,
    };
  });


export const setPaymentOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; status: "paid" | "failed" }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as never as { supabase: any; userId: string };
    await assertAdmin(supabase, userId);
    const { error } = await supabase
      .from("payment_orders")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
