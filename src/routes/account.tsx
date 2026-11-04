import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/account")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  head: () => ({ meta: [{ title: "My Account — JB Pocket VPN" }] }),
  component: CustomerAccount,
});

function CustomerAccount() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("Loading your account…");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        await navigate({ to: "/login" });
        return;
      }
      const user = authData.user;
      const initialName = String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Customer");
      const { data, error } = await supabase.from("customer_profiles")
        .upsert({ user_id: user.id, name: initialName, email: user.email ?? "" }, { onConflict: "user_id" })
        .select("name,email")
        .single();
      if (!active) return;
      setEmail(String(data?.email ?? user.email ?? ""));
      setName(String(data?.name ?? initialName));
      setStatus(error ? "Your account is signed in, but your profile could not be loaded. Please contact support." : "Your customer profile is ready.");
    }
    void loadProfile();
    return () => { active = false; };
  }, [navigate]);

  async function updateName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setBusy(false);
      await navigate({ to: "/login" });
      return;
    }
    const { error } = await supabase.from("customer_profiles")
      .update({ name: name.trim() })
      .eq("user_id", data.user.id);
    setBusy(false);
    setStatus(error ? error.message : "Profile updated successfully.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    await navigate({ to: "/login" });
  }

  return (
    <main className="min-h-screen bg-[#050b1b] px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center justify-between">
          <Link to="/" className="font-bold">🛡️ JB Pocket VPN</Link>
          <button onClick={signOut} className="rounded-lg border border-white/20 px-4 py-2 text-sm">Sign out</button>
        </header>
        <section className="mt-10 rounded-3xl border border-white/10 bg-[#0a172b] p-7 sm:p-9">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">Customer account</p>
          <h1 className="mt-2 text-3xl font-extrabold">Welcome</h1>
          <p className="mt-2 text-sm text-slate-400">{status}</p>
          <form onSubmit={updateName} className="mt-8 space-y-4">
            <label className="block text-sm font-medium">Full name<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#061326] px-4 py-3" /></label>
            <label className="block text-sm font-medium">Email address<input readOnly value={email} className="mt-2 w-full rounded-xl border border-white/10 bg-[#061326]/60 px-4 py-3 text-slate-400" /></label>
            <button disabled={busy || !name.trim()} className="rounded-xl bg-emerald-400 px-6 py-3 font-bold text-slate-950 disabled:opacity-60">{busy ? "Saving…" : "Save profile"}</button>
          </form>
          <p className="mt-8 border-t border-white/10 pt-5 text-xs leading-6 text-slate-400">Your customer login and profile are available. VPN activation and subscription management are not enabled from this page yet.</p>
        </section>
      </div>
    </main>
  );
}
