import { createClient } from "@supabase/supabase-js";

export const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server environment variable: ${name}`);
  return value;
}

export function adminDb() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function authenticatedUser(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) throw new Error("Sign in is required");
  const client = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Invalid or expired session");
  return data.user;
}

const apiBase = () => Deno.env.get("PHONEPE_ENV") === "production"
  ? "https://api.phonepe.com/apis/pg"
  : "https://api-preprod.phonepe.com/apis/pg-sandbox";

export async function phonepeToken() {
  const base = apiBase();
  const authBase = Deno.env.get("PHONEPE_ENV") === "production"
    ? "https://api.phonepe.com/apis/identity-manager"
    : "https://api-preprod.phonepe.com/apis/pg-sandbox";
  const body = new URLSearchParams({
    client_id: env("PHONEPE_CLIENT_ID"),
    client_version: env("PHONEPE_CLIENT_VERSION"),
    client_secret: env("PHONEPE_CLIENT_SECRET"),
    grant_type: "client_credentials",
  });
  const response = await fetch(`${authBase}/v1/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) {
    console.error("PhonePe OAuth failed", response.status);
    throw new Error("PhonePe authorization failed");
  }
  return { token: result.access_token as string, base };
}
