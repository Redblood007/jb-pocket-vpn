import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
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

function validPublicKey(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9+/]{43}=$/.test(value);
}
function validServerResult(value: Record<string, unknown>) {
  return typeof value.assigned_ip === "string" &&
    typeof value.server_public_key === "string" &&
    typeof value.endpoint === "string" &&
    /^[A-Za-z0-9+/]{43}=$/.test(value.server_public_key) &&
    /^[0-9a-fA-F:.]+\/\d{1,3}$/.test(value.assigned_ip) &&
    /^[a-zA-Z0-9.-]+:\d{1,5}$/.test(value.endpoint);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let peerId: string | null = null;
  try {
    const user = await authenticatedUser(req);
    const body = await req.json();
    const publicKey = body?.public_key;
    const deviceName = typeof body?.device_name === "string"
      ? body.device_name.trim().slice(0, 48)
      : "Android device";
    if (!validPublicKey(publicKey)) return json({ error: "A valid WireGuard public_key is required" }, 400);

    const db = adminDb();
    const { data: profile } = await db.from("customer_profiles")
      .select("name,email").eq("user_id", user.id).maybeSingle();

    const { data: freePlan, error: freePlanError } = await db.from("plans")
      .select("id,slug,devices,features").eq("slug", "free").single();
    if (freePlanError || !freePlan) throw new Error("Free plan is not configured");

    let { data: customer, error: customerError } = await db.from("customers")
      .select("id,plan_id,active,expires_at")
      .eq("auth_user_id", user.id).maybeSingle();
    if (customerError) throw new Error("Could not load customer account");

    if (!customer) {
      const metadataName = typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null;
      const displayName = profile?.name || metadataName || user.email?.split("@")[0] || "VPN user";
      const { data: created, error } = await db.from("customers").upsert({
        auth_user_id: user.id,
        name: displayName.slice(0, 120),
        email: profile?.email || user.email || null,
        plan_id: freePlan.id,
        active: true,
      }, { onConflict: "auth_user_id" }).select("id,plan_id,active,expires_at").single();
      if (error || !created) throw new Error("Could not create customer account");
      customer = created;
    }

    if (!customer.active || (customer.expires_at && Date.parse(customer.expires_at) <= Date.now())) {
      return json({ error: "Your account is inactive. Contact support." }, 403);
    }

    const now = new Date().toISOString();
    const { data: subscription, error: subscriptionError } = await db.from("subscriptions")
      .select("id,plan_id,ends_at")
      .eq("customer_id", customer.id).eq("status", "active").gt("ends_at", now)
      .order("ends_at", { ascending: false }).limit(1).maybeSingle();
    if (subscriptionError) throw new Error("Could not verify subscription");

    let planId = subscription?.plan_id ?? customer.plan_id ?? freePlan.id;
    let { data: plan, error: planError } = await db.from("plans")
      .select("id,slug,devices,features").eq("id", planId).maybeSingle();
    if (planError) throw new Error("Could not verify plan");
    if (!plan || (plan.slug !== "free" && !subscription)) {
      plan = freePlan;
      planId = freePlan.id;
    }

    const { data: existingPeer, error: existingError } = await db.from("wireguard_peers")
      .select("id,customer_id,status").eq("public_key", publicKey).maybeSingle();
    if (existingError) throw new Error("Could not check existing VPN device");
    if (existingPeer && existingPeer.customer_id !== customer.id) {
      return json({ error: "This WireGuard key is already registered to another account" }, 409);
    }

    const { count, error: countError } = await db.from("wireguard_peers")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customer.id).in("status", ["active", "provisioning"]);
    if (countError) throw new Error("Could not check device limit");
    if (!existingPeer && (count ?? 0) >= plan.devices) {
      return json({ error: `Your ${plan.slug} plan allows ${plan.devices} device(s)` }, 403);
    }

    const peerValues = {
      customer_id: customer.id,
      subscription_id: subscription?.id ?? null,
      public_key: publicKey,
      status: "provisioning",
      revoked_at: null,
    };
    if (existingPeer) {
      peerId = existingPeer.id;
      const { error } = await db.from("wireguard_peers").update(peerValues).eq("id", peerId);
      if (error) throw new Error("Could not prepare VPN device");
    } else {
      const { data: peer, error } = await db.from("wireguard_peers")
        .insert(peerValues).select("id").single();
      if (error || !peer) throw new Error("Could not register VPN device");
      peerId = peer.id;
    }

    const provisionedPeerId = peerId;
    if (!provisionedPeerId) throw new Error("VPN device ID was not created");

    const apiUrl = new URL(env("BOTNIX_WG_API_URL"));
    if (apiUrl.protocol !== "https:") throw new Error("Botnix WireGuard API must use HTTPS");
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env("BOTNIX_WG_API_TOKEN")}`,
        "Content-Type": "application/json",
        "Idempotency-Key": provisionedPeerId,
      },
      body: JSON.stringify({
        peer_id: provisionedPeerId,
        customer_id: customer.id,
        public_key: publicKey,
        device_name: deviceName,
      }),
      signal: AbortSignal.timeout(12000),
    });
    const serverResult = await response.json().catch(() => ({}));
    if (!response.ok || !validServerResult(serverResult)) {
      console.error("Botnix peer provisioning failed", response.status);
      await db.from("wireguard_peers").update({ status: "error" }).eq("id", peerId);
      return json({ error: "VPN server could not provision this device. Please retry shortly." }, 502);
    }

    const { error: updateError } = await db.from("wireguard_peers").update({
      assigned_ip: serverResult.assigned_ip,
      status: "active",
    }).eq("id", peerId);
    if (updateError) throw new Error("VPN server added the peer but its database status could not be saved");

    return json({
      peer_id: peerId,
      assigned_ip: serverResult.assigned_ip,
      server_public_key: serverResult.server_public_key,
      endpoint: serverResult.endpoint,
      allowed_ips: typeof serverResult.allowed_ips === "string" ? serverResult.allowed_ips : "0.0.0.0/0, ::/0",
      dns: typeof serverResult.dns === "string" ? serverResult.dns : "1.1.1.1, 1.0.0.1",
      persistent_keepalive: Number.isInteger(serverResult.persistent_keepalive)
        ? serverResult.persistent_keepalive
        : 25,
      plan: plan.slug,
      daily_limit_bytes: plan.slug === "free" ? 100000000 : null,
    });
  } catch (error) {
    console.error("create-wireguard-peer failed", error instanceof Error ? error.message : "unknown error");
    if (peerId) {
      try {
        await adminDb().from("wireguard_peers").update({ status: "error" }).eq("id", peerId);
      } catch { /* Keep the original failure response. */ }
    }
    const message = error instanceof Error ? error.message : "Unexpected server error";
    const status = message.includes("Sign in") || message.includes("session") ? 401 : 500;
    return json({ error: status === 401 ? message : "Could not create VPN device" }, status);
  }
});
