import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account — JB Pocket VPN Pro" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    setBusy(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data.session) {
      await navigate({ to: "/checkout" });
    } else {
      setMessage("Account created. Verify your email, then sign in to continue to payment.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8">
        <Link to="/" className="text-sm text-primary">← JB Pocket VPN Pro</Link>
        <h1 className="mt-6 font-display text-3xl font-bold">Create your account</h1>
        <p className="mt-2 text-sm text-muted-foreground">Register with your email to manage your VPN subscription.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm">Full name
            <input required autoComplete="name" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-3" />
          </label>
          <label className="block text-sm">Email
            <input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-3" />
          </label>
          <label className="block text-sm">Password
            <input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-3" />
            <span className="mt-1 block text-xs text-muted-foreground">Use at least 8 characters.</span>
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {message && <p role="status" className="text-sm text-primary">{message}</p>}
          <button disabled={busy} className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">{busy ? "Creating account…" : "Create account"}</button>
        </form>
        <p className="mt-5 text-sm text-muted-foreground">Already registered? <Link to="/login" className="text-primary underline">Sign in</Link></p>
      </section>
    </main>
  );
}
