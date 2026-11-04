import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset Password — JB Pocket VPN" }] }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + "/reset-password",
    });
    setBusy(false);
    if (resetError) setError(resetError.message);
    else setMessage("If an account exists for that email, a password reset link will be sent.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050b1b] px-4 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0a172b] p-8">
        <Link to="/login" className="text-sm text-emerald-300">← Back to login</Link>
        <h1 className="mt-7 text-2xl font-bold">Reset your password</h1>
        <p className="mt-2 text-sm text-slate-400">Enter your account email and we’ll send a reset link if the account exists.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" className="w-full rounded-xl border border-white/15 bg-[#061326] px-4 py-3 text-white" />
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          {message && <p role="status" className="text-sm text-emerald-200">{message}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-emerald-400 py-3 font-bold text-slate-950 disabled:opacity-60">{busy ? "Sending…" : "Send reset link"}</button>
        </form>
      </section>
    </main>
  );
}
