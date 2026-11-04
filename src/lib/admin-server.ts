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
      supabase.from("payment_orders").select("id, order_reference, customer_id, plan_id, amount_inr, currency, status, provider, provider_payment_id, utr_reference, submitted_at, reviewed_at, paid_at, expires_at, created_at").order("created_at", { ascending: false }).limit(100),
    ]);
    if (customers.error) throw new Error(customers.error.message);
    if (plans.error) throw new Error(plans.error.message);
    if (payments.error) throw new Error(payments.error.message);
    return { customers: customers.data as Customer[], plans: plans.data as Plan[], payments: payments.data };
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
