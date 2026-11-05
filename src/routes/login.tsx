import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Customer Login — JB Pocket VPN" }] }),
  component: CustomerLogin,
});

function CustomerLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function saveProfile(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
    const displayName = name.trim() || String(user.user_metadata?.["full_name"] ?? user.user_metadata?.["name"] ?? user.email?.split("@")[0] ?? "Customer");
    const { error: profileError } = await supabase.from("customer_profiles").upsert(
      { user_id: user.id, name: displayName, email: user.email ?? email },
      { onConflict: "user_id" },
    );
    if (profileError) throw profileError;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: globalThis.location.origin + "/account",
          },
        });
        if (authError) throw authError;
        if (data.user && data.session) {
          await saveProfile(data.user);
          await navigate({ to: "/account" });
        } else {
          setMessage("Registration received. Check your email and confirm your address, then sign in.");
        }
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        if (data.user) await saveProfile(data.user);
        await navigate({ to: "/account" });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to complete authentication. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050b1b] px-4 py-10 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0a172b] p-7 shadow-2xl sm:p-9">
        <Link to="/" className="text-sm text-emerald-300 hover:text-emerald-200">← Back to JB Pocket VPN</Link>
        <div className="mt-7 text-center">
          <div className="text-4xl">🛡️</div>
          <h1 className="mt-3 text-2xl font-extrabold">JB Pocket VPN</h1>
          <p className="mt-2 text-sm text-slate-400">{mode === "login" ? "Sign in to your customer account" : "Create your customer account"}</p>
        </div>
        <div className="mt-7 grid grid-cols-2 rounded-xl border border-white/10 p-1">
          <button type="button" onClick={() => { setMode("login"); setMessage(""); setError(""); }} className={`rounded-lg py-2 text-sm font-semibold ${mode === "login" ? "bg-emerald-400 text-slate-950" : "text-slate-300"}`}>Login</button>
          <button type="button" onClick={() => { setMode("signup"); setMessage(""); setError(""); }} className={`rounded-lg py-2 text-sm font-semibold ${mode === "signup" ? "bg-emerald-400 text-slate-950" : "text-slate-300"}`}>Sign Up</button>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && <label className="block text-sm font-medium">Full name<input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#061326] px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="Your name" /></label>}
          <label className="block text-sm font-medium">Email address<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#061326] px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="you@example.com" /></label>
          <label className="block text-sm font-medium">Password<input required minLength={8} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#061326] px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="At least 8 characters" /></label>
          {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
          {message && <p role="status" className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-emerald-400 py-3 font-bold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60">{busy ? "Please wait…" : mode === "login" ? "Login" : "Create account"}</button>
        </form>
        <div className="mt-5 flex justify-between text-sm">
          <Link to="/forgot-password" className="text-emerald-300 hover:underline">Forgot password?</Link>
          <Link to="/admin-login" className="text-slate-400 hover:text-white">Admin login</Link>
        </div>
      </section>
    </main>
  );
}
