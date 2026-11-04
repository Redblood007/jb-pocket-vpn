import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — JB Pocket VPN Pro" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    await navigate({ to: "/checkout" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8">
        <Link to="/" className="text-sm text-primary">← JB Pocket VPN Pro</Link>
        <h1 className="mt-6 font-display text-3xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to purchase or manage your VPN plan.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm">Email
            <input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-3" />
          </label>
          <label className="block text-sm">Password
            <input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-3" />
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <button disabled={busy} className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button>
        </form>
        <p className="mt-5 text-sm text-muted-foreground">New customer? <Link to="/signup" className="text-primary underline">Create account</Link></p>
      </section>
    </main>
  );
}
