import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { listPublicPlans, requestFreeAccess } from "@/lib/admin-server";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JB Pocket VPN — Your Privacy, Our Priority" },
      { name: "description", content: "Explore JB Pocket VPN subscription plans and learn about secure, private browsing." },
      { property: "og:title", content: "JB Pocket VPN — Your Privacy, Our Priority" },
      { property: "og:description", content: "Private browsing, simple plans, and secure connectivity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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


type PhonePeOrder = {
  merchant_order_id: string;
  checkout_url: string;
  amount_inr: number;
  currency: "INR";
};

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
  const [selectedPlan, setSelectedPlan] = useState<{ id: string; name: string } | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<PhonePeOrder | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [utr, setUtr] = useState("");
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [utrSubmitted, setUtrSubmitted] = useState(false);
  const [showFreeForm, setShowFreeForm] = useState(false);
  const [freeName, setFreeName] = useState("");
  const [freePhone, setFreePhone] = useState("");
  const [freeBusy, setFreeBusy] = useState(false);
  const [freeDone, setFreeDone] = useState(false);
  const [freeError, setFreeError] = useState<string | null>(null);\n  const [returnOrder, setReturnOrder] = useState<string | null>(null);
  const { data: plans } = useSuspenseQuery(plansQuery);

  async function startPhonePePayment(plan: { id: string; name: string }) {
    setSelectedPlan(plan);
    setPaymentOrder(null);
    setPaymentError(null);
    setPaymentStatus(null);
    setCreatingOrder(true);
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setCreatingOrder(false);
      setPaymentError("Please sign in or create a customer account before placing a payment order.");
      return;
    }
    const { data, error } = await supabase.functions.invoke("create-phonepe-order", {
      body: { plan_id: plan.id },
    });
    setCreatingOrder(false);
    if (error || !data?.checkout_url || !data?.merchant_order_id) {
      setPaymentError(data?.error ?? error?.message ?? "Could not start PhonePe checkout. Please try again.");
      return;
    }
    setPaymentOrder(data as PhonePeOrder);
    window.location.assign(data.checkout_url);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") !== "return") return;
    const order = params.get("order");
    if (!order) {
      setPaymentError("Payment return is missing its order reference.");
      setSelectedPlan({ id: "", name: "Payment" });
      return;
    }
    setReturnOrder(order);
    setSelectedPlan({ id: "", name: "Payment status" });
    setPaymentStatus("checking");
    let cancelled = false;
    const verify = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setPaymentStatus("pending");
        setPaymentError("Sign in with the account used for checkout to verify your payment.");
        return;
      }
      const { data, error } = await supabase.functions.invoke("verify-phonepe-payment", {
        body: { merchant_order_id: order },
      });
      if (cancelled) return;
      if (error) {
        setPaymentStatus("pending");
        setPaymentError(error.message || "Payment verification is temporarily unavailable.");
      } else if (data?.status === "paid" && data?.verified) {
        setPaymentStatus("paid");
      } else if (data?.status === "failed") {
        setPaymentStatus("failed");
      } else {
        setPaymentStatus("pending");
      }
    };
    void verify();
    window.history.replaceState({}, "", window.location.pathname);
    return () => { cancelled = true; };
  }, []);      {selectedPlan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-4" role="dialog" aria-modal="true" aria-labelledby="phonepe-payment-title">
          <div className="my-auto w-full max-w-lg rounded-3xl border border-emerald-300/30 bg-[#0a172b] p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-300">PhonePe secure checkout</p><h2 id="phonepe-payment-title" className="mt-2 text-2xl font-extrabold">{selectedPlan.name}</h2></div>
              <button type="button" onClick={() => { setSelectedPlan(null); setPaymentStatus(null); }} className="rounded-lg border border-white/20 px-3 py-1 text-slate-300 hover:text-white" aria-label="Close payment window">✕</button>
            </div>
            {creatingOrder && <p className="mt-6 text-sm text-slate-300">Creating your secure PhonePe order…</p>}
            {paymentError && <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">{paymentError} {!paymentOrder && <Link to="/login" className="ml-1 underline">Customer login</Link>}</div>}
            {paymentStatus === "checking" && <p className="mt-6 text-sm text-slate-300">Checking payment directly with PhonePe…</p>}
            {paymentStatus === "paid" && <div className="mt-6 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-5"><h3 className="text-lg font-bold text-emerald-200">Payment verified</h3><p className="mt-2 text-sm text-slate-300">Your subscription has been activated. Sign in to view your account.</p></div>}
            {paymentStatus === "pending" && <div className="mt-6 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-5"><h3 className="text-lg font-bold text-amber-200">Payment is not confirmed yet</h3><p className="mt-2 text-sm text-slate-300">Do not pay again yet. Sign in and retry verification, or contact support if the amount was debited.</p><button type="button" onClick={() => { if (returnOrder) { setPaymentStatus("checking"); setPaymentError(null); void supabase.functions.invoke("verify-phonepe-payment", { body: { merchant_order_id: returnOrder } }).then(({data,error}) => { if(error) { setPaymentStatus("pending"); setPaymentError(error.message); } else if(data?.status === "paid" && data?.verified) setPaymentStatus("paid"); else if(data?.status === "failed") setPaymentStatus("failed"); else setPaymentStatus("pending"); }); } }} className="mt-4 rounded-xl border border-amber-200/40 px-4 py-2 text-sm font-semibold text-amber-100">Check payment again</button></div>}
            {paymentStatus === "failed" && <div className="mt-6 rounded-2xl border border-rose-300/30 bg-rose-300/10 p-5"><h3 className="text-lg font-bold text-rose-200">Payment failed</h3><p className="mt-2 text-sm text-slate-300">PhonePe did not confirm this payment. You can close this window and try again.</p></div>}
            <button type="button" onClick={() => { setSelectedPlan(null); setPaymentStatus(null); }} className="mt-5 w-full py-2 text-sm text-slate-400 hover:text-white">Close</button>
          </div>
        </div>
      )}
