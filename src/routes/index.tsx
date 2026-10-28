import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listPublicPlans } from "@/lib/admin-server";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ShieldX VPN Pro — Fast, Private, Affordable" },
      { name: "description", content: "ShieldX VPN Pro: 60+ countries, no-logs, unlimited speed. Monthly plans starting at just ₹99." },
      { property: "og:title", content: "ShieldX VPN Pro — Fast, Private, Affordable" },
      { property: "og:description", content: "Unlimited, no-logs VPN with monthly plans from ₹99." },
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

const features = [
  ["⚡", "Super fast", "10 Gbps servers, no speed limit."],
  ["🔒", "Military-grade encryption", "AES-256 + WireGuard protocol."],
  ["🌍", "60+ countries", "Connect anywhere in one tap."],
  ["🚫", "Strict no-logs", "Your activity is never stored."],
  ["📺", "Streaming ready", "Watch your shows without buffering."],
  ["📱", "All devices", "Android, iPhone, Windows, Mac."],
];

const faqs = [
  ["Can I cancel anytime?", "Yes. Monthly plans have no contract — cancel any time."],
  ["Is there a money-back guarantee?", "Yes, 7-day full refund if you're not happy."],
  ["Which payment methods?", "UPI, cards and net banking."],
];

function Index() {
  const [open, setOpen] = useState<number | null>(0);
  const { data: plans } = useSuspenseQuery(plansQuery);
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="font-display text-xl font-bold">🛡️ ShieldX <span className="text-primary">Pro</span></span>
        <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
        </nav>
        <a href="#pricing" className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">Get VPN</a>
      </header>

      <section className="bg-glow px-6 pb-24 pt-20 text-center">
        <p className="mx-auto mb-6 w-fit rounded-full border border-border px-4 py-1 text-xs text-primary">● 1M+ users protected</p>
        <h1 className="mx-auto max-w-3xl font-display text-5xl font-bold leading-tight md:text-7xl">
          Internet ko <span className="text-primary">safe</span> aur <span className="text-accent">fast</span> banao
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Best VPN Pro — sabse sasta monthly plan, sirf ₹99 se shuru. Koi contract nahi.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <a href="#pricing" className="rounded-full bg-primary px-8 py-4 font-bold text-primary-foreground shadow-glow transition hover:scale-105">Plans dekho</a>
          <a href="#features" className="rounded-full border border-border px-8 py-4 font-medium hover:bg-secondary">Features</a>
        </div>
        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-6">
          {[["60+", "Countries"], ["3000+", "Servers"], ["99.9%", "Uptime"]].map(([v, l]) => (
            <div key={l}><div className="font-display text-3xl font-bold text-primary">{v}</div><div className="text-sm text-muted-foreground">{l}</div></div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center font-display text-4xl font-bold">Kyun ShieldX Pro?</h2>
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
        <h2 className="text-center font-display text-4xl font-bold">Monthly Plans</h2>
        <p className="mt-3 text-center text-muted-foreground">Best rate, cancel anytime. 7-day money-back guarantee.</p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div key={p.name} className={`relative rounded-3xl border p-8 ${p.popular ? "border-primary bg-card shadow-glow" : "border-border bg-card"}`}>
              {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">MOST POPULAR</span>}
              <h3 className="font-display text-xl font-bold">{p.name}</h3>
              <div className="mt-4 flex items-end gap-1">
                <span className="font-display text-5xl font-bold">₹{p.price}</span>
                <span className="mb-2 text-muted-foreground">/month</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                {p.features.map((f) => <li key={f} className="flex gap-2"><span className="text-primary">✓</span>{f}</li>)}
              </ul>
              <button className={`mt-8 w-full rounded-full py-3 font-bold transition ${p.popular ? "bg-primary text-primary-foreground hover:opacity-90" : "border border-border hover:bg-secondary"}`}>
                Choose {p.name}
              </button>
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
        © 2026 ShieldX VPN Pro. All rights reserved.
      </footer>
    </div>
  );
}
