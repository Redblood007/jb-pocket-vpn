import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listPublicPlans, createPendingUpiOrder } from "@/lib/admin-server";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Choose a VPN plan — JB Pocket VPN Pro" }] }),
  component: CheckoutPage,
});

function planTerm(name: string) {
  const value = name.toLowerCase();
  if (value.includes("basic")) return "1 month";
  if (value.includes("pro")) return "6 months";
  if (value.includes("premium")) return "1 year";
  return "Subscription";
}

function CheckoutPage() {
  const [upiUrl, setUpiUrl] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [busyPlan, setBusyPlan] = useState("");
  const createOrder = useServerFn(createPendingUpiOrder);
  const { data: plans, isLoading, error } = useQuery({ queryKey: ["plans"], queryFn: () => listPublicPlans() });

  async function startPayment(planId: string) {
    setBusyPlan(planId);
    setNotice("");
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setBusyPlan("");
      setNotice("Please sign in or create an account before checkout.");
      return;
    }
    try {
      const order = await createOrder({ data: { planId } });
      setReference(order.reference);
      setAmount(order.amountInr);
      setUpiUrl(order.upiUrl);
      setNotice("Scan the QR or open your UPI app. Payment remains pending until an admin verifies the transaction.");
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Could not create payment order.");
    } finally {
      setBusyPlan("");
    }
  }

  const qrImageUrl = upiUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(upiUrl)}`
    : "";

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="text-sm text-primary">← Back to home</Link>
        <h1 className="mt-5 font-display text-3xl font-bold">Choose your VPN plan</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in first, then scan the plan QR code or open a UPI app.</p>
        {isLoading && <p className="mt-8">Loading plans…</p>}
        {error && <p role="alert" className="mt-8 text-destructive">Could not load plans: {error.message}</p>}
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {(plans ?? []).map(plan => (
            <article key={plan.id} className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-xl font-bold">{plan.name}</h2>
              <p className="mt-3 text-3xl font-bold">₹{plan.price_inr}</p>
              <p className="mt-2 text-sm text-muted-foreground">{planTerm(plan.name)} · {plan.devices} user(s)</p>
              <button disabled={!!busyPlan} onClick={() => startPayment(plan.id)} className="mt-6 w-full rounded-full bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-50">
                {busyPlan === plan.id ? "Preparing QR…" : "Show UPI QR"}
              </button>
            </article>
          ))}
        </div>
        {notice && <p role="status" className="mt-6 rounded-xl border border-border bg-card p-4 text-sm">{notice}</p>}
        {reference && upiUrl && (
          <section className="mt-5 grid gap-5 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[280px_1fr]">
            <div className="rounded-xl bg-white p-3">
              <img src={qrImageUrl} alt="UPI payment QR code" width="280" height="280" className="mx-auto h-auto w-full" />
            </div>
            <div>
              <h2 className="font-bold">UPI payment request</h2>
              <p className="mt-2 text-2xl font-bold">₹{amount}</p>
              <p className="mt-2 text-sm">Reference: <strong>{reference}</strong></p>
              <a href={upiUrl} className="mt-4 inline-flex rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground">Open UPI app</a>
              <p className="mt-3 text-xs text-muted-foreground">The QR is generated from this order's exact amount and reference. The QR image is rendered by a third-party QR service. Do not treat a payment screenshot or app return as proof of payment; VPN access is enabled only after merchant-side verification.</p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
