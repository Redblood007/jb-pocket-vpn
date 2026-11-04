import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listPublicPlans } from "@/lib/admin-server";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JB Pocket VPN — Your Privacy, Our Priority" },
      { name: "description", content: "Explore JB Pocket VPN subscription plans and learn about secure, private browsing." },
      { property: "og:title", content: "JB Pocket VPN — Your Privacy, Our Priority" },
      { property: "og:description", content: "Private browsing, simple plans, and secure connectivity." },
      { property: "og:type", content: "website" },
      { name: "theme-color", content: "#050b1b" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(plansQuery),
  component: Index,
});

const plansQuery = queryOptions({
  queryKey: ["plans"],
  queryFn: async () => {
    try {
      return await listPublicPlans();
    } catch (error) {
      console.error("[Homepage] Could not load subscription plans:", error);
      return [];
    }
  },
});

const WHATSAPP_NUMBER = "917006269882";
function whatsappLink(planName: string, price: number) {
  const message = `Hi, I want to know more about the ${planName} plan (₹${price}).`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

const benefits = [
  { icon: "⚡", title: "High-speed browsing", text: "Enjoy responsive connections for everyday browsing." },
  { icon: "🛡️", title: "Privacy-focused", text: "Designed to help protect your traffic on untrusted networks." },
  { icon: "🌍", title: "Global access", text: "Explore available VPN locations from one simple interface." },
  { icon: "🔒", title: "Secure by design", text: "A clear focus on protecting your online connection." },
];

const faqs = [
  ["How do I choose a plan?", "Compare the available plans below. Contact our team if you need help choosing."],
  ["How do I get started?", "Choose a plan and contact our team. We'll guide you through the next steps."],
  ["Which devices are supported?", "The service is being prepared for Android, iOS, Windows, and Mac. Availability depends on the released apps."],
  ["Can I cancel a subscription?", "Contact support for help with subscription changes and cancellation."],
];

function Index() {
  const [open, setOpen] = useState<number | null>(0);
  const { data: plans } = useSuspenseQuery(plansQuery);

  return (
    <main className="min-h-screen overflow-hidden bg-[#050b1b] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050b1b]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="#home" className="flex items-center gap-3" aria-label="JB Pocket VPN home">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-emerald-300/50 bg-emerald-400/10 text-2xl shadow-[0_0_28px_rgba(16,185,129,.2)]">🛡️</span>
            <span className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">JB Pocket <span className="text-emerald-400">VPN</span></span>
          </a>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-300 lg:flex">
            <a href="#home" className="transition hover:text-emerald-300">Home</a>
            <a href="#pricing" className="transition hover:text-emerald-300">Pricing</a>
            <a href="#features" className="transition hover:text-emerald-300">Features</a>
            <a href="#how-it-works" className="transition hover:text-emerald-300">How It Works</a>
            <a href="#faq" className="transition hover:text-emerald-300">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/admin-login" className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold transition hover:border-emerald-400 hover:text-emerald-300">Admin Login</Link>
            <a href="#pricing" className="hidden rounded-xl bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 shadow-[0_8px_30px_rgba(16,185,129,.2)] transition hover:bg-emerald-300 sm:inline-flex">Get Started</a>
          </div>
        </div>
      </header>

      <section id="home" className="relative isolate">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_78%_30%,rgba(79,70,229,.28),transparent_38%),radial-gradient(ellipse_at_20%_60%,rgba(16,185,129,.12),transparent_42%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 lg:min-h-[570px] lg:grid-cols-[1.05fr_.95fr] lg:py-24">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-200"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" /> Fast · Secure · Reliable</div>
            <h1 className="max-w-2xl font-display text-5xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl xl:text-7xl">Your Privacy,<br /><span className="bg-gradient-to-r from-emerald-300 via-green-400 to-cyan-400 bg-clip-text text-transparent">Our Priority</span></h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">JB Pocket VPN is being built to make private browsing simple. Explore plans and get help choosing the right connection for your devices.</p>
            <div className="mt-9 flex flex-wrap gap-4">
              <a href="#pricing" className="rounded-xl bg-gradient-to-r from-emerald-400 to-green-300 px-7 py-4 font-bold text-slate-950 shadow-[0_10px_36px_rgba(16,185,129,.22)] transition hover:-translate-y-0.5">Get Started Now <span className="ml-2">→</span></a>
              <a href="#features" className="rounded-xl border border-slate-500/60 px-7 py-4 font-semibold text-white transition hover:border-emerald-300 hover:text-emerald-200">Explore Features</a>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-slate-300">
              <span>🛡️ Privacy focused</span><span>⚡ Simple setup</span><span>🌐 Multi-device vision</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute inset-8 rounded-full bg-blue-600/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-gradient-to-br from-[#10284a] via-[#09172d] to-[#07101f] p-5 shadow-[0_25px_100px_rgba(0,0,0,.45)] sm:p-8">
              <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full border border-cyan-300/10" />
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div className="flex items-center gap-2 font-bold"><span className="text-xl">🛡️</span> JB Pocket <span className="text-emerald-300">VPN</span></div>
                <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200">VPN CONCEPT</span>
              </div>
              <div className="mx-auto my-8 grid max-w-xs place-items-center rounded-[2rem] border border-cyan-200/20 bg-[#061326]/90 px-8 py-9 shadow-[inset_0_0_40px_rgba(34,211,238,.06)]">
                <div className="grid h-32 w-32 place-items-center rounded-full border-[7px] border-emerald-400 text-6xl text-emerald-300 shadow-[0_0_45px_rgba(16,185,129,.28)]">⏻</div>
                <div className="mt-5 text-xl font-extrabold text-emerald-300">Private browsing</div>
                <div className="mt-1 text-sm text-slate-400">Your connection dashboard</div>
                <div className="mt-6 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm"><div className="flex justify-between text-slate-400"><span>Connection status</span><span className="text-amber-300">Service setup</span></div><div className="mt-2 h-2 rounded-full bg-slate-700"><div className="h-2 w-2/3 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" /></div></div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-xs text-slate-300"><div className="rounded-xl bg-white/5 p-3"><div className="text-xl">🔐</div>Privacy</div><div className="rounded-xl bg-white/5 p-3"><div className="text-xl">⚡</div>Speed</div><div className="rounded-xl bg-white/5 p-3"><div className="text-xl">🌍</div>Locations</div></div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="border-y border-white/10 bg-[#071225] py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold uppercase tracking-[.24em] text-emerald-300">Our VPN Plans</p><h2 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">Choose Your <span className="text-emerald-300">Plan</span></h2><p className="mt-4 text-slate-400">Transparent options managed by the JB Pocket VPN team.</p></div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {plans.length === 0 ? (
              <div className="rounded-3xl border border-amber-300/20 bg-amber-300/5 p-8 text-center md:col-span-2 xl:col-span-3"><h3 className="text-xl font-bold">Plans temporarily unavailable</h3><p className="mt-2 text-sm text-slate-400">Pricing could not be loaded right now. Please contact support or check back shortly.</p></div>
            ) : plans.map((p) => (
              <article key={p.id} className={`relative flex flex-col rounded-3xl border p-7 transition duration-300 hover:-translate-y-1 ${p.popular ? "border-emerald-400 bg-gradient-to-b from-emerald-400/10 to-[#0a172b] shadow-[0_0_45px_rgba(16,185,129,.10)]" : "border-slate-700/80 bg-[#0a172b]"}`}>
                {p.popular && <span className="absolute -top-3 left-7 rounded-full bg-emerald-400 px-4 py-1 text-xs font-extrabold text-slate-950">MOST POPULAR</span>}
                <h3 className="font-display text-2xl font-bold">{p.name}</h3>
                <div className="mt-5 flex items-end gap-2"><span className="font-display text-5xl font-extrabold">₹{p.price_inr}</span><span className="mb-2 text-sm text-slate-400">/ month</span></div>
                <div className="mt-6 flex-1 space-y-3 text-sm text-slate-300">{((p.features as string[]) ?? []).map((feature) => <div key={feature} className="flex gap-3"><span className="font-bold text-emerald-300">✓</span><span>{feature}</span></div>)}</div>
                <a href={whatsappLink(p.name, p.price_inr)} target="_blank" rel="noopener noreferrer" className={`mt-8 rounded-xl px-5 py-3 text-center font-bold transition ${p.popular ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300" : "border border-emerald-300/50 text-emerald-200 hover:bg-emerald-300/10"}`}>Enquire on WhatsApp ↗</a>
              </article>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">Plan details and availability are confirmed by our support team. Payment processing is not yet enabled on this website.</p>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="text-center"><p className="text-sm font-bold uppercase tracking-[.24em] text-emerald-300">Why JB Pocket VPN</p><h2 className="mt-3 font-display text-4xl font-extrabold">Built around <span className="text-emerald-300">your privacy</span></h2></div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{benefits.map((item) => <article key={item.title} className="rounded-2xl border border-slate-700/70 bg-gradient-to-b from-[#101e35] to-[#091326] p-6"><div className="text-3xl">{item.icon}</div><h3 className="mt-5 text-lg font-bold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{item.text}</p></article>)}</div>
      </section>

      <section id="how-it-works" className="border-y border-white/10 bg-[#071225] py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8"><div className="text-center"><p className="text-sm font-bold uppercase tracking-[.24em] text-emerald-300">Getting started</p><h2 className="mt-3 font-display text-4xl font-extrabold">Simple steps, clear guidance</h2></div><div className="mt-12 grid gap-6 md:grid-cols-3">{[["01","Choose a plan","Review the available subscription options."],["02","Talk to our team","Ask questions and confirm service availability."],["03","Follow setup guidance","Our team will guide you through supported setup steps."]].map(([number,title,description]) => <div key={number} className="rounded-2xl border border-slate-700 bg-[#0a172b] p-7"><div className="font-display text-4xl font-extrabold text-emerald-300">{number}</div><h3 className="mt-4 text-xl font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{description}</p></div>)}</div></div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-5 py-20 sm:px-8"><div className="text-center"><p className="text-sm font-bold uppercase tracking-[.24em] text-emerald-300">FAQ</p><h2 className="mt-3 font-display text-4xl font-extrabold">Questions, answered</h2></div><div className="mt-10 space-y-3">{faqs.map(([question,answer],i) => <div key={question} className="rounded-2xl border border-slate-700 bg-[#0a172b]"><button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-center justify-between gap-4 p-5 text-left font-semibold hover:text-emerald-300">{question}<span className="text-xl text-emerald-300">{open === i ? "−" : "+"}</span></button>{open === i && <p className="px-5 pb-5 text-sm leading-6 text-slate-400">{answer}</p>}</div>)}</div></section>

      <footer className="border-t border-white/10 bg-[#030814]"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-8"><div><div className="font-display text-lg font-extrabold text-white">JB Pocket <span className="text-emerald-300">VPN</span></div><p className="mt-1">Privacy-focused connectivity, made simple.</p></div><div className="flex flex-wrap gap-5"><a href="#features" className="hover:text-emerald-300">Features</a><a href="#pricing" className="hover:text-emerald-300">Pricing</a><Link to="/login" className="hover:text-emerald-300">Customer Login</Link><Link to="/admin-login" className="hover:text-emerald-300">Admin</Link></div><p>© 2026 JB Pocket VPN. All rights reserved.</p></div></footer>
    </main>
  );
}
