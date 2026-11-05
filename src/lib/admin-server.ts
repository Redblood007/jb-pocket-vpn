import { createServerFn } from "@tanstack/react-start";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type Plan = Database["public"]["Tables"]["plans"]["Row"];
export type Customer = Omit<Database["public"]["Tables"]["customers"]["Row"], "vpn_password">;

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

async function assertAdmin(supabase: SupabaseClient<Database>, userId: string) {
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
      supabase: SupabaseClient<Database>;
      userId: string;
    };
    await assertAdmin(supabase, userId);
    const [customers, plans] = await Promise.all([
      supabase.from("customers").select("id,name,phone,email,plan_id,vpn_username,started_on,notes,active,created_at,updated_at").order("created_at", { ascending: false }),
      supabase.from("plans").select("*").order("sort_order"),
    ]);
    if (customers.error) throw new Error(customers.error.message);
    if (plans.error) throw new Error(plans.error.message);
    return { customers: customers.data as Customer[], plans: plans.data as Plan[] };
  });

export type NewCustomer = {
  name: string;
  phone?: string;
  email?: string;
  plan_id?: string | null;
  vpn_username?: string;
  started_on?: string;
  notes?: string;
};

export const createCustomer = createServerFn({ method: "POST" })
  .inputValidator((input: NewCustomer) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as never as { supabase: SupabaseClient<Database>; userId: string };
    await assertAdmin(supabase, userId);
    const { error } = await supabase.from("customers").insert({
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      plan_id: data.plan_id || null,
      vpn_username: data.vpn_username || null,
      // VPN credentials are provisioned as WireGuard keys; never store user passwords here.
      vpn_password: null,
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
    const { supabase, userId } = context as never as { supabase: SupabaseClient<Database>; userId: string };
    await assertAdmin(supabase, userId);
    const { error } = await supabase.from("customers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setCustomerActive = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; active: boolean }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as never as { supabase: SupabaseClient<Database>; userId: string };
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
    const { supabase, userId } = context as never as { supabase: SupabaseClient<Database>; userId: string };
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


export const listAdminPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as never as { supabase: SupabaseClient<Database>; userId: string };
    await assertAdmin(supabase, userId);
    const { data, error } = await supabase
      .from("payment_orders")
      .select("id, order_reference, customer_id, plan_id, amount_inr, currency, status, provider, provider_payment_id, utr_reference, submitted_at, created_at, expires_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const approveManualPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { order_reference: string; review_note?: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as never as { supabase: SupabaseClient<Database>; userId: string };
    await assertAdmin(supabase, userId);
    const { data: subscriptionId, error } = await supabase.rpc("admin_approve_manual_upi_payment", {
      p_order_reference: data.order_reference,
      p_review_note: data.review_note || "Bank statement reconciled by admin",
    });
    if (error) throw new Error(error.message);
    return { ok: true, subscriptionId };
  });
