import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listPublicPlans } from "@/lib/admin-server";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JB Pocket VPN — Fast, Private, Affordable" },
      { name: "description", content: "JB Pocket VPN uses WireGuard technology. Explore available plans and manage your VPN service." },
      { property: "og:title", content: "JB Pocket VPN — Fast, Private, Affordable" },
      { property: "og:description", content: "WireGuard-based VPN service with account and plan management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(plansQuery),
  component: Index,
});

const plansQuery = queryOptions({
  queryKey: ["plans"],
  queryFn: () => listPublicPlans(),
});

const WHATSAPP_NUMBER = "917006269882";

function whatsappLink(planName: string, price: number, billingPeriod: string) {
  const periodLabel = billingPeriod === "yearly" ? "year" : "month";
  const text = `Hi, I want the ${planName} plan (₹${price}/${periodLabel}).`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

const features = [
  ["🔐", "WireGuard protocol", "Modern VPN tunnelling through the official WireGuard library."],
  ["📱", "Native Android app", "Import a WireGuard profile and use Android's VPN permission flow."],
  ["🛡️", "Local profile handling", "The current Android MVP imports your tunnel profile on-device."],
  ["👤", "Customer management", "Admin tools for customer records and account status."],
  ["📋", "Plan management", "Manage service plans from the authenticated admin panel."],
  ["💳", "Payment review", "Review submitted manual UPI payment references in the admin panel."],
];

const faqs = [
  ["What is included in the Free plan?", "The current Free plan includes 100 MB per day, ad-supported access, one device and a daily data reset."],
  ["How do I connect on Android?", "Import your WireGuard configuration file in the JB Pocket VPN Android app, then approve Android's VPN permission."],
  ["Where can I manage plans and customers?", "Authorized administrators can manage plans, customer records and manual UPI payment reviews in the admin panel."],
];

function Index() {
  const [open, setOpen] = useState<number | null>(0);
  const { data: plans } = useSuspenseQuery(plansQuery);
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="font-display text-xl font-bold">🛡️ JB Pocket VPN</span>
        <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
        </nav>
        <a href="#pricing" className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">Get VPN</a>
      </header>

      <section className="bg-glow px-6 pb-24 pt-20 text-center">
        <p className="mx-auto mb-6 w-fit rounded-full border border-border px-4 py-1 text-xs text-primary">● WireGuard-powered VPN</p>
        <h1 className="mx-auto max-w-3xl font-display text-5xl font-bold leading-tight md:text-7xl">
          Connect with <span className="text-primary">WireGuard</span> and stay in control
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Start with the Free plan: 100 MB per day, ad-supported access and one device. Paid plans are also available.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <a href="#pricing" className="rounded-full bg-primary px-8 py-4 font-bold text-primary-foreground shadow-glow transition hover:scale-105">See Plans</a>
          <a href="#features" className="rounded-full border border-border px-8 py-4 font-medium hover:bg-secondary">Features</a>
        </div>
        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-6">
          {[["WireGuard", "VPN protocol"], ["Android", "Native app"], ["Admin", "Plan controls"]].map(([v, l]) => (
            <div key={l}><div className="font-display text-xl font-bold text-primary">{v}</div><div className="text-sm text-muted-foreground">{l}</div></div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center font-display text-4xl font-bold">Why JB Pocket VPN?</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(([i, t, d]) => (
            <div key={t} className="rounded-2xl border border-border bg-card p-6">
              <div className="text-3xl">{i}</div>
              <h3 className="mt-4 font-display text-lg font-bold">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center font-display text-4xl font-bold">Subscription Plans</h2>
        <p className="mt-3 text-center text-muted-foreground">Choose monthly or yearly billing. Cancel anytime on monthly plans.</p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className={`relative rounded-3xl border p-8 ${p.popular ? "border-primary bg-card shadow-glow" : "border-border bg-card"}`}>
              {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">MOST POPULAR</span>}
              <h3 className="font-display text-xl font-bold">{p.name}</h3>
              <div className="mt-4 flex items-end gap-1">
                <span className="font-display text-5xl font-bold">₹{p.price_inr}</span>
                <span className="mb-2 text-muted-foreground">/{p.billing_period === "yearly" ? "year" : "month"}</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                {((p.features as string[]) ?? []).map((f) => <li key={f} className="flex gap-2"><span className="text-primary">✓</span>{f}</li>)}
              </ul>
              <a
                href={whatsappLink(p.name, p.price_inr, p.billing_period)}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-8 flex w-full items-center justify-center gap-2 rounded-full py-3 font-bold transition ${p.popular ? "bg-primary text-primary-foreground hover:opacity-90" : "border border-border hover:bg-secondary"}`}
              >
                <span>💬</span> Order on WhatsApp
              </a>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="text-center font-display text-4xl font-bold">FAQ</h2>
        <div className="mt-10 space-y-3">
          {faqs.map(([q, a], i) => (
            <div key={q} className="rounded-2xl border border-border bg-card">
              <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full justify-between p-5 text-left font-medium">
                {q}<span className="text-primary">{open === i ? "−" : "+"}</span>
              </button>
              {open === i && <p className="px-5 pb-5 text-sm text-muted-foreground">{a}</p>}
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © 2026 JB Pocket VPN. All rights reserved. · <Link to="/admin-login" className="hover:text-foreground">Admin</Link>
      </footer>
    </div>
  );
}
