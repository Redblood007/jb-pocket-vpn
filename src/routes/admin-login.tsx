import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "Admin Login — JB Pocket VPN" },
      { name: "description", content: "JB Pocket VPN admin panel login." },
      { property: "og:title", content: "Admin Login — JB Pocket VPN" },
      { property: "og:description", content: "JB Pocket VPN admin panel login." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError("Wrong email or password. Please try again.");
      return;
    }
    navigate({ to: "/admin" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 font-sans text-foreground">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8">
        <div className="text-center">
          <span className="font-display text-xl font-bold">🛡️ JB <span className="text-primary">Pocket VPN</span></span>
          <h1 className="mt-4 font-display text-2xl font-bold">Admin Login</h1>
          <p className="mt-2 text-sm text-muted-foreground">For the site owner only.</p>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="admin-email" className="mb-1 block text-sm font-medium">Email</label>
            <input
              id="admin-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="Enter admin email"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="mb-1 block text-sm font-medium">Password</label>
            <input
              id="admin-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
