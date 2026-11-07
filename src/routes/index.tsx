import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listPublicPlans } from "@/lib/admin-server";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JK Pocket VPN — Private. Secure. Simple." },
      {
        name: "description",
        content:
          "Explore JK Pocket VPN plans and learn how to get started with private, secure internet access.",
      },
      { property: "og:title", content: "JK Pocket VPN — Private. Secure. Simple." },
      {
        property: "og:description",
        content: "Straightforward VPN plans and privacy-focused connectivity.",
      },
      { property: "og:type", content: "website" },
      { name: "theme-color", content: "#071426" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(plansQuery),
  component: HomePage,
});

const plansQuery = queryOptions({
  queryKey: ["plans"],
  queryFn: async () => {
    try {
      return await listPublicPlans();
    } catch (error) {
      console.error("[JK Pocket VPN] Unable to load plans:", error);
      return [];
    }
  },
});

const benefits = [
  {
    icon: "⚡",
    title: "Simple to use",
    description: "A straightforward experience for everyday browsing.",
  },
  {
    icon: "🛡️",
    title: "Privacy-minded",
    description: "Designed to help protect your connection on untrusted networks.",
  },
  {
    icon: "🌍",
    title: "Server choices",
    description: "See the VPN locations that are configured and available to your account.",
  },
  {
    icon: "📱",
    title: "Mobile focused",
    description: "A clean experience designed with phone users in mind.",
  },
];

const faqs = [
  {
    question: "How do I get started?",
    answer:
      "Create a customer account, review the available plans, and contact support if you need help activating a subscription.",
  },
  {
    question: "How do I manage my account?",
    answer:
      "Use the customer login to access your account. Subscription management features will appear as they are enabled.",
  },
  {
    question: "Which devices can I use?",
    answer:
      "Device support depends on the app versions that have been released and tested. Check the download section for currently available builds.",
  },
  {
    question: "How can I get help?",
    answer:
      "Contact the JK Pocket VPN support team using the support details supplied by the service operator.",
  },
];

function HomePage() {
  const { data: plans } = useSuspenseQuery(plansQuery);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <main className="min-h-screen overflow-hidden bg-[#071426] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#071426]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="JK Pocket VPN home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-xl text-slate-950">🛡️</span>
            <span className="font-display text-lg font-bold tracking-tight">
              JK Pocket <span className="text-emerald-300">VPN</span>
            </span>
          </Link>
          <button
            type="button"
            className="rounded-lg border border-white/15 px-3 py-2 text-sm md:hidden"
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
            aria-label="Toggle navigation"
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
          <nav className="hidden items-center gap-7 text-sm text-slate-300 md:flex">
            <a href="#features" className="transition hover:text-emerald-300">Features</a>
            <a href="#plans" className="transition hover:text-emerald-300">Plans</a>
            <a href="#faq" className="transition hover:text-emerald-300">FAQ</a>
            <Link to="/login" className="transition hover:text-emerald-300">Login</Link>
            <Link to="/login" className="rounded-full bg-emerald-400 px-5 py-2.5 font-bold text-slate-950 transition hover:bg-emerald-300">Get started</Link>
          </nav>
        </div>
        {menuOpen && (
          <nav className="grid gap-1 border-t border-white/10 px-5 py-3 text-sm md:hidden">
            <a href="#features" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 hover:bg-white/5">Features</a>
            <a href="#plans" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 hover:bg-white/5">Plans</a>
            <a href="#faq" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 hover:bg-white/5">FAQ</a>
            <Link to="/login" className="rounded-lg px-3 py-2 hover:bg-white/5">Customer login</Link>
          </nav>
        )}
      </header>

      <section className="relative isolate">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-glow opacity-80" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[.16em] text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              JK Pocket VPN
            </div>
            <h1 className="mt-7 max-w-3xl font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
              Your internet.
              <span className="block text-emerald-300">Your privacy.</span>
              Your control.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
              A simple VPN experience with clear plans and account access. Choose a plan and follow the setup steps for your supported device.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#plans" className="rounded-full bg-emerald-400 px-7 py-3.5 text-sm font-bold text-slate-950 shadow-glow transition hover:bg-emerald-300">
                Explore plans
              </a>
              <Link to="/login" className="rounded-full border border-white/20 px-7 py-3.5 text-sm font-semibold text-white transition hover:border-emerald-300/60 hover:bg-white/5">
                Customer login
              </Link>
            </div>
            <p className="mt-5 text-xs leading-6 text-slate-500">
              VPN availability and performance depend on active server infrastructure and your subscription.
            </p>
          </div>

          <div className="mx-auto w-full max-w-md">
            <div className="rounded-[2rem] border border-emerald-300/20 bg-gradient-to-br from-[#102b3c] to-[#0b1729] p-6 shadow-2xl sm:p-8">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-300">Connection dashboard</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">Preview</span>
              </div>
              <div className="my-10 flex flex-col items-center text-center">
                <div className="flex h-36 w-36 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-300/5 shadow-glow">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-400 text-5xl text-slate-950">⌁</div>
                </div>
                <h2 className="mt-7 font-display text-2xl font-bold">Secure connection</h2>
                <p className="mt-2 text-sm text-slate-400">Connect using your configured VPN app</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                  <p className="text-xs text-slate-500">Privacy</p>
                  <p className="mt-1 font-semibold text-emerald-300">Protected by VPN</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                  <p className="text-xs text-slate-500">Account</p>
                  <p className="mt-1 font-semibold">Customer access</p>
                </div>
              </div>
              <p className="mt-4 text-center text-[11px] text-slate-500">Illustrative website preview — not live tunnel telemetry.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-white/5 bg-[#0a1b30] py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-300">Why JK Pocket VPN</p>
            <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Privacy without the complication</h2>
            <p className="mt-4 leading-7 text-slate-400">Clear information and a simple path from account creation to setup.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((item) => (
              <article key={item.title} className="rounded-2xl border border-white/10 bg-[#0d2138] p-6 transition hover:-translate-y-1 hover:border-emerald-300/30">
                <span className="text-3xl">{item.icon}</span>
                <h3 className="mt-5 font-display text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="plans" className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-300">Subscription plans</p>
            <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Choose your plan</h2>
            <p className="mt-4 leading-7 text-slate-400">Plan details are loaded from the project database. Sign in to continue.</p>
          </div>
          {plans.length > 0 ? (
            <div className="mt-12 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <article key={plan.id} className={`relative flex flex-col rounded-3xl border p-7 ${plan.popular ? "border-emerald-300/60 bg-[#102b3c] shadow-glow" : "border-white/10 bg-[#0b1b2e]"}`}>
                  {plan.popular && <span className="absolute -top-3 left-6 rounded-full bg-emerald-400 px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-950">Popular</span>}
                  <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold">₹{Number(plan.price_inr).toLocaleString("en-IN")}</span>
                    <span className="text-sm text-slate-500">INR</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{plan.devices} device{plan.devices === 1 ? "" : "s"}</p>
                  <ul className="my-7 flex-1 space-y-3">
                    {(plan.features ?? []).map((feature, index) => (
                      <li key={index} className="flex gap-2 text-sm leading-6 text-slate-300">
                        <span className="text-emerald-300">✓</span><span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/login" className="block rounded-full bg-emerald-400 px-5 py-3 text-center text-sm font-bold text-slate-950 transition hover:bg-emerald-300">
                    Continue to account
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-white/10 bg-[#0b1b2e] p-8 text-center">
              <h3 className="font-display text-lg font-bold">Plans are being prepared</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">Please check again shortly or contact support for current subscription information.</p>
            </div>
          )}
        </div>
      </section>

      <section className="border-y border-white/5 bg-[#0a1b30] py-16">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 sm:px-8 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-300">Your account</p>
            <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Already have an account?</h2>
            <p className="mt-2 text-sm text-slate-400">Sign in to access your customer profile.</p>
          </div>
          <Link to="/login" className="rounded-full border border-emerald-300/50 px-7 py-3 font-semibold text-emerald-200 transition hover:bg-emerald-300/10">Login or create account</Link>
        </div>
      </section>

      <section id="faq" className="py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-300">Help center</p>
            <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Frequently asked questions</h2>
          </div>
          <div className="mt-10 space-y-3">
            {faqs.map((faq, index) => (
              <div key={faq.question} className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1b2e]">
                <button type="button" className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left font-semibold" onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index}>
                  <span>{faq.question}</span><span className="text-xl text-emerald-300">{openFaq === index ? "−" : "+"}</span>
                </button>
                {openFaq === index && <p className="px-5 pb-5 text-sm leading-7 text-slate-400">{faq.answer}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#050e1b]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm text-slate-500 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="font-display font-bold text-slate-200">🛡️ JK Pocket VPN</div>
          <p>© {new Date().getFullYear()} JK Pocket VPN. All rights reserved.</p>
          <div className="flex gap-5">
            <Link to="/login" className="hover:text-emerald-300">Customer login</Link>
            <Link to="/admin-login" className="hover:text-emerald-300">Admin</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
