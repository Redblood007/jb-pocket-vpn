import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listAdminData,
  createCustomer,
  deleteCustomer,
  setCustomerActive,
  updatePlan,
  listAdminPayments,
  approveManualPayment,
  type Plan,
} from "@/lib/admin-server";

export const Route = createFileRoute("/_authenticated/_admin/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — JB Pocket VPN" },
      { name: "description", content: "JB Pocket VPN admin panel." },
      { property: "og:title", content: "Admin Panel — JB Pocket VPN" },
      { property: "og:description", content: "JB Pocket VPN admin panel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [tab, setTab] = useState<"customers" | "plans" | "payments">("customers");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchAdminData = useServerFn(listAdminData);
  const fetchPayments = useServerFn(listAdminPayments);
  const approvePayment = useMutation({ mutationFn: useServerFn(approveManualPayment), onSuccess: () => { toast.success("Manual UPI payment approved"); queryClient.invalidateQueries({ queryKey: ["admin-payments"] }); refresh(); }, onError: (e) => toast.error("Approval failed: " + e.message) });
  const paymentsQuery = useQuery({ queryKey: ["admin-payments"], queryFn: () => fetchPayments(), enabled: tab === "payments" });
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-data"],
    queryFn: () => fetchAdminData(),
  });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/admin-login", replace: true });
  }

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-data"] });
  const refreshPublicPlans = () => queryClient.invalidateQueries({ queryKey: ["plans"] });

  const addCustomer = useMutation({
    mutationFn: useServerFn(createCustomer),
    onSuccess: () => {
      toast.success("Customer added");
      refresh();
    },
    onError: (e) => toast.error("Could not add customer: " + e.message),
  });
  const removeCustomer = useMutation({
    mutationFn: useServerFn(deleteCustomer),
    onSuccess: () => {
      toast.success("Customer deleted");
      refresh();
    },
    onError: (e) => toast.error("Delete failed: " + e.message),
  });
  const toggleActive = useMutation({
    mutationFn: useServerFn(setCustomerActive),
    onSuccess: () => refresh(),
    onError: (e) => toast.error("Update failed: " + e.message),
  });
  const savePlan = useMutation({
    mutationFn: useServerFn(updatePlan),
    onSuccess: () => {
      toast.success("Plan saved — the website will update too");
      refresh();
      refreshPublicPlans();
    },
    onError: (e) => toast.error("Save failed: " + e.message),
  });

  const plans = data?.plans ?? [];
  const customers = data?.customers ?? [];
  const planById = new Map<string, Plan>(plans.map((p) => [p.id, p]));

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Loading...</div>;
  }
  if (error) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-destructive">Error: {error.message}</div>;
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Toaster />
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-display text-lg font-bold">🛡️ JB Pocket VPN <span className="text-primary">Admin</span></span>
          <div className="flex items-center gap-3">
            <button onClick={() => setTab("customers")} className={`rounded-full px-4 py-2 text-sm font-medium ${tab === "customers" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:bg-secondary"}`}>
              Customers ({customers.length})
            </button>
            <button onClick={() => setTab("payments")} className={`rounded-full px-4 py-2 text-sm font-medium ${tab === "payments" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:bg-secondary"}`}>Payments</button>
            <button onClick={() => setTab("plans")} className={`rounded-full px-4 py-2 text-sm font-medium ${tab === "plans" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:bg-secondary"}`}>
              Plans
            </button>
            <button onClick={handleSignOut} className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {tab === "payments" ? (
          <PaymentsTab payments={paymentsQuery.data ?? []} loading={paymentsQuery.isLoading} onApprove={(order_reference) => approvePayment.mutate({ data: { order_reference, review_note: "Bank statement reconciled by admin" } })} approving={approvePayment.isPending} />
        ) : tab === "customers" ? (
          <CustomersTab
            customers={customers}
            plans={plans}
            planById={planById}
            onAdd={(c) => addCustomer.mutate({ data: c })}
            onDelete={(id) => removeCustomer.mutate({ data: { id } })}
            onToggle={(id, active) => toggleActive.mutate({ data: { id, active } })}
          />
        ) : (
          <PlansTab plans={plans} onSave={(p) => savePlan.mutate({ data: p })} />
        )}
        <ChangePasswordCard />
      </main>
    </div>
  );
}

type CustomerRow = Awaited<ReturnType<typeof listAdminData>>["customers"][number];

function CustomersTab({
  customers,
  plans,
  planById,
  onAdd,
  onDelete,
  onToggle,
}: {
  customers: CustomerRow[];
  plans: Plan[];
  planById: Map<string, Plan>;
  onAdd: (c: { name: string; phone?: string; email?: string; plan_id?: string; vpn_username?: string; started_on?: string; notes?: string }) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", plan_id: "", vpn_username: "", started_on: "", notes: "" });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Customers</h1>
        <button onClick={() => setOpen(true)} className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:opacity-90">
          + New customer
        </button>
      </div>

      {customers.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
          No customers yet. Use the "New customer" button to add your first one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">VPN username</th>
                <th className="px-4 py-3 font-medium">Start</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{c.name}{c.notes ? <div className="text-xs text-muted-foreground">{c.notes}</div> : null}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone || "—"}</td>
                  <td className="px-4 py-3">{c.plan_id ? (planById.get(c.plan_id)?.name ?? "—") : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.vpn_username || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.started_on}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onToggle(c.id, !c.active)}
                      className={`rounded-full px-3 py-1 text-xs font-bold ${c.active ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}
                    >
                      {c.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {confirmDelete === c.id ? (
                      <span className="flex justify-end gap-2">
                        <button onClick={() => { onDelete(c.id); setConfirmDelete(null); }} className="rounded-full bg-destructive px-3 py-1 text-xs font-bold text-white">Yes, delete</button>
                        <button onClick={() => setConfirmDelete(null)} className="rounded-full border border-border px-3 py-1 text-xs">Cancel</button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmDelete(c.id)} className="text-xs text-muted-foreground hover:text-destructive">Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-xl font-bold">New customer</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Name *" value={form.name} onChange={set("name")} required />
              <Field label="Phone" value={form.phone} onChange={set("phone")} />
              <Field label="Email" value={form.email} onChange={set("email")} type="email" />
              <div>
                <label className="mb-1 block text-sm font-medium">Plan</label>
                <select value={form.plan_id} onChange={set("plan_id")} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                  <option value="">—</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (₹{p.price_inr})</option>
                  ))}
                </select>
              </div>
              <Field label="VPN username" value={form.vpn_username} onChange={set("vpn_username")} />
              <Field label="Start date" value={form.started_on} onChange={set("started_on")} type="date" />
              <Field label="Note (optional)" value={form.notes} onChange={set("notes")} />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setOpen(false)} className="rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-secondary">Cancel</button>
              <button
                onClick={() => {
                  if (!form.name.trim()) { toast.error("Name is required"); return; }
                  onAdd({ ...form, name: form.name.trim() });
                  setForm({ name: "", phone: "", email: "", plan_id: "", vpn_username: "", started_on: "", notes: "" });
                  setOpen(false);
                }}
                className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input type={type} required={required} value={value} onChange={onChange} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
    </div>
  );
}

function PlansTab({ plans, onSave }: { plans: Plan[]; onSave: (p: { id: string; name: string; price_inr: number; devices: number; popular: boolean; features: string[] }) => void }) {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">Plans</h1>
      <p className="mb-6 text-sm text-muted-foreground">Make changes here — the website's "Monthly Plans" section updates instantly.</p>
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} onSave={onSave} />
        ))}
      </div>
    </div>
  );
}

function PlanCard({ plan, onSave }: { plan: Plan; onSave: (p: { id: string; name: string; price_inr: number; devices: number; popular: boolean; features: string[] }) => void }) {
  const [name, setName] = useState(plan.name);
  const [price, setPrice] = useState(String(plan.price_inr));
  const [devices, setDevices] = useState(String(plan.devices));
  const [popular, setPopular] = useState(plan.popular);
  const [features, setFeatures] = useState(((plan.features as string[]) ?? []).join("\n"));

  return (
    <div className={`rounded-3xl border p-6 ${plan.popular ? "border-primary bg-card shadow-glow" : "border-border bg-card"}`}>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Price (₹/month)</label>
            <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Devices</label>
            <input type="number" min={1} value={devices} onChange={(e) => setDevices(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={popular} onChange={(e) => setPopular(e.target.checked)} className="accent-primary" />
          Show "Most Popular" badge
        </label>
        <div>
          <label className="mb-1 block text-sm font-medium">Features (one per line)</label>
          <textarea rows={5} value={features} onChange={(e) => setFeatures(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </div>
      </div>
      <button
        onClick={() => {
          const priceNum = Number(price);
          const devNum = Number(devices);
          if (!name.trim() || !Number.isFinite(priceNum) || priceNum < 0) { toast.error("Enter a valid name and price"); return; }
          onSave({
            id: plan.id,
            name: name.trim(),
            price_inr: Math.round(priceNum),
            devices: Number.isFinite(devNum) && devNum >= 1 ? Math.round(devNum) : 1,
            popular,
            features: features.split("\n").map((f) => f.trim()).filter(Boolean),
          });
        }}
        className="mt-4 w-full rounded-full bg-primary py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
      >
        Save
      </button>
    </div>
  );
}

function ChangePasswordCard() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleChange() {
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: next, current_password: current });
    setBusy(false);
    if (error) {
      toast.error("Could not change password: " + error.message);
      return;
    }
    toast.success("Password changed");
    setOpen(false);
    setCurrent("");
    setNext("");
  }

  return (
    <div className="mt-10 rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-lg font-bold">Admin password</h2>
      {open ? (
        <div className="mt-4 max-w-sm space-y-3">
          <input type="password" placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          <input type="password" placeholder="New password (min 8 chars)" value={next} onChange={(e) => setNext(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          <div className="flex gap-3">
            <button onClick={handleChange} disabled={busy || next.length < 8} className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50">Change</button>
            <button onClick={() => setOpen(false)} className="rounded-full border border-border px-5 py-2 text-sm hover:bg-secondary">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="mt-3 rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-secondary">
          Change password
        </button>
      )}
    </div>
  );
}


function PaymentsTab({ payments, loading, onApprove, approving }: {
  payments: Array<{ id: string; order_reference: string; amount_inr: number; currency: string; status: string; provider: string; utr_reference: string | null; submitted_at: string | null; created_at: string; expires_at: string }>;
  loading: boolean;
  onApprove: (order_reference: string) => void;
  approving: boolean;
}) {
  if (loading) return <div className="py-10 text-center text-muted-foreground">Loading payments...</div>;
  const pending = payments.filter((p) => p.status === "pending");
  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="font-display text-2xl font-bold">Payment review</h1><p className="mt-1 text-sm text-muted-foreground">Verify UTR against your bank statement before approving. Never approve from a screenshot alone.</p></div>
        <span className="rounded-full bg-secondary px-3 py-1 text-sm">{pending.length} pending</span>
      </div>
      {payments.length === 0 ? <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">No payment orders yet.</div> : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="px-4 py-3">Order</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Provider</th><th className="px-4 py-3">UTR / Txn ref</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead>
            <tbody>{payments.map((p) => <tr key={p.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 font-mono text-xs">{p.order_reference}</td>
              <td className="px-4 py-3">₹{p.amount_inr}</td>
              <td className="px-4 py-3">{p.provider}</td>
              <td className="px-4 py-3 font-mono text-xs">{p.utr_reference || "—"}</td>
              <td className="px-4 py-3">{p.status}</td>
              <td className="px-4 py-3">{p.provider === "manual" && p.status === "pending" && p.utr_reference ? <button disabled={approving} onClick={() => onApprove(p.order_reference)} className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground disabled:opacity-50">Approve after bank check</button> : "—"}</td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
