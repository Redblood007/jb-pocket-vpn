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

function CheckoutPage() {
  const [upiUrl, setUpiUrl] = useState("");
  const [reference, setReference] = useState("");
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
      setUpiUrl(order.upiUrl);
      setNotice("UPI payment request created. After paying, the order will remain pending until payment is verified.");
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Could not create payment order.");
    } finally {
      setBusyPlan("");
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="text-sm text-primary">← Back to home</Link>
        <h1 className="mt-5 font-display text-3xl font-bold">Choose your VPN plan</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in first, then pay using a UPI app.</p>
        {isLoading && <p className="mt-8">Loading plans…</p>}
        {error && <p role="alert" className="mt-8 text-destructive">Could not load plans: {error.message}</p>}
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {(plans ?? []).map(plan => (
            <article key={plan.id} className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-xl font-bold">{plan.name}</h2>
              <p className="mt-3 text-3xl font-bold">₹{plan.price_inr}<span className="text-sm font-normal text-muted-foreground"> / month</span></p>
              <p className="mt-3 text-sm text-muted-foreground">{plan.devices} device(s)</p>
              <button disabled={!!busyPlan} onClick={() => startPayment(plan.id)} className="mt-6 w-full rounded-full bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-50">
                {busyPlan === plan.id ? "Preparing UPI…" : "Pay with UPI"}
              </button>
            </article>
          ))}
        </div>
        {notice && <p role="status" className="mt-6 rounded-xl border border-border bg-card p-4 text-sm">{notice}</p>}
        {reference && upiUrl && (
          <section className="mt-5 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-bold">UPI payment request</h2>
            <p className="mt-2 text-sm">Reference: <strong>{reference}</strong></p>
            <a href={upiUrl} className="mt-4 inline-flex rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground">Open UPI app</a>
            <p className="mt-3 text-xs text-muted-foreground">Do not close this page until you note the reference. Payment is not activated from the UPI app return screen; the server must verify the transaction first.</p>
          </section>
        )}
      </div>
    </main>
  );
}
