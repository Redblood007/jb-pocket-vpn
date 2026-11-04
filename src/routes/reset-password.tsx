import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Choose a New Password — JB Pocket VPN" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMessage("Your password has been updated.");
    window.setTimeout(() => void navigate({ to: "/login" }), 1200);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050b1b] px-4 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0a172b] p-8">
        <Link to="/login" className="text-sm text-emerald-300">← Back to login</Link>
        <h1 className="mt-7 text-2xl font-bold">Choose a new password</h1>
        <p className="mt-2 text-sm text-slate-400">Use at least 8 characters.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" className="w-full rounded-xl border border-white/15 bg-[#061326] px-4 py-3 text-white" />
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          {message && <p role="status" className="text-sm text-emerald-200">{message}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-emerald-400 py-3 font-bold text-slate-950 disabled:opacity-60">{busy ? "Saving…" : "Update password"}</button>
        </form>
      </section>
    </main>
  );
}
