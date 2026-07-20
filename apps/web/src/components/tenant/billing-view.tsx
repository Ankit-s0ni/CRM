"use client";

import { ArrowRight, CreditCard, Download, Gauge, Landmark, Plus, ReceiptText, ShieldCheck, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { BillingError, BillingLoading, BillingNotice, BillingPage, BillingPanel, MetricCard, StatusBadge } from "@/components/billing/billing-primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/api-error";
import type { BillingInvoice, BillingPaymentMethod, BillingPlan, BillingProfile, TenantSubscription } from "@/lib/billing-types";
import { formatBillingDate, formatMoney, sumMoney } from "@/lib/billing-types";

type PlanPreview = {
  currency: string;
  currentAmount: string;
  targetAmount: string;
  amountDue: string;
  creditAmount: string;
  effectiveAt: string;
};

export function TenantBillingView() {
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [subscription, setSubscription] = useState<TenantSubscription | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [methods, setMethods] = useState<BillingPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [addingMethod, setAddingMethod] = useState(false);
  const [planChoice, setPlanChoice] = useState<BillingPlan | null>(null);
  const [preview, setPreview] = useState<PlanPreview | null>(null);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try {
      const [profileResponse, subscriptionResponse, invoicesResponse, methodsResponse] = await Promise.all([
        apiClient.get<{ data: BillingProfile }>("/billing/profile"),
        apiClient.get<{ data: TenantSubscription }>("/billing/subscription"),
        apiClient.get<{ data: BillingInvoice[] }>("/billing/invoices"),
        apiClient.get<{ data: BillingPaymentMethod[] }>("/billing/payment-methods"),
      ]);
      setProfile(profileResponse.data.data);
      setSubscription(subscriptionResponse.data.data);
      setInvoices(invoicesResponse.data.data);
      setMethods(methodsResponse.data.data);
      setError("");
    } catch (cause) {
      setError(getApiErrorMessage(cause, "Billing information could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiClient.get<{ data: BillingProfile }>("/billing/profile"),
      apiClient.get<{ data: TenantSubscription }>("/billing/subscription"),
      apiClient.get<{ data: BillingInvoice[] }>("/billing/invoices"),
      apiClient.get<{ data: BillingPaymentMethod[] }>("/billing/payment-methods"),
    ]).then(([profileResponse, subscriptionResponse, invoicesResponse, methodsResponse]) => {
      if (!active) return;
      setProfile(profileResponse.data.data);
      setSubscription(subscriptionResponse.data.data);
      setInvoices(invoicesResponse.data.data);
      setMethods(methodsResponse.data.data);
      setError("");
    }).catch((cause) => {
      if (active) setError(getApiErrorMessage(cause, "Billing information could not be loaded."));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  if (loading) return <BillingPage title="Billing & subscription" description="Manage your plan, invoices and payment profile."><BillingLoading /></BillingPage>;
  if (error && !subscription) return <BillingPage title="Billing & subscription" description="Manage your plan, invoices and payment profile."><BillingError message={error} /></BillingPage>;
  if (!profile || !subscription) return null;

  const seatPercent = Math.min(100, Math.round(subscription.usage.activeEmployees / Math.max(1, subscription.usage.maximumEmployees) * 100));
  const openBalance = sumMoney(invoices.filter(({ status }) => status === "OPEN").map(({ amountDue }) => amountDue), profile.currency);

  return <BillingPage title="Billing & subscription" description="One place for your legal billing identity, module plan, employee seats, payment methods and GST invoices." action={<StatusBadge status={subscription.status} />}>
    {error && <BillingError message={error} />}
    {notice && <BillingNotice tone="success">{notice}</BillingNotice>}
    {subscription.dunningState !== "NONE" && <BillingNotice tone="warning"><strong>Payment action required.</strong> Your workspace is in {subscription.dunningState.replaceAll("_", " ").toLowerCase()}. Update the payment method or contact support before access is affected.</BillingNotice>}

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard icon={<Landmark className="size-5" />} label="Current plan" value={subscription.plan.name} detail={`${formatMoney(subscription.plan.pricePerUser, subscription.plan.currency)} per employee · ${subscription.plan.billingPeriod.toLowerCase()}`} />
      <MetricCard icon={<Gauge className="size-5" />} label="Employee usage" value={`${subscription.usage.activeEmployees} / ${subscription.usage.maximumEmployees}`} detail={`${seatPercent}% of the plan limit is currently in use`} />
      <MetricCard icon={<ReceiptText className="size-5" />} label="Open balance" value={formatMoney(openBalance, profile.currency)} detail={`${invoices.filter(({ status }) => status === "OPEN").length} invoice${invoices.filter(({ status }) => status === "OPEN").length === 1 ? "" : "s"} awaiting payment`} />
      <MetricCard icon={<CreditCard className="size-5" />} label="Payment methods" value={String(methods.length)} detail={methods.some(({ isDefault }) => isDefault) ? "A default payment method is active" : "Add a default method before upgrading"} />
    </div>

    <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
      <BillingPanel title="Subscription and included modules" description={`Current period ends ${formatBillingDate(subscription.currentPeriodEnd)}`}>
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h3 className="text-2xl font-bold">{subscription.plan.name}</h3><StatusBadge status={subscription.status} /></div><p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">{subscription.plan.description || "Your active DeltCRM workspace plan."}</p></div><div className="text-right"><div className="text-2xl font-bold text-primary">{formatMoney(subscription.plan.pricePerUser, subscription.plan.currency)}</div><div className="text-xs text-outline">per employee / {subscription.plan.billingPeriod === "YEARLY" ? "year" : "month"}</div></div></div>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-outline-variant"><div className="h-full rounded-full bg-gradient-to-r from-primary to-primary-container" style={{ width: `${seatPercent}%` }} /></div>
          <div className="mt-2 flex justify-between text-xs text-outline"><span>{subscription.usage.activeEmployees} active employees</span><span>{subscription.usage.maximumEmployees} maximum</span></div>
          <div className="mt-6 flex flex-wrap gap-2">{subscription.plan.modules.map(({ module }) => <span className="rounded-lg bg-zinc-50 px-3 py-2 text-xs font-semibold text-primary" key={module.id}>{module.name}</span>)}</div>
          {subscription.pendingPlanId && <div className="mt-6"><BillingNotice tone="info">A plan change is scheduled for {formatBillingDate(subscription.scheduledChangeAt)}.</BillingNotice></div>}
        </div>
      </BillingPanel>
      <BillingPanel title="Legal billing profile" description="Used on every immutable invoice" action={<Button variant="outline" size="sm" onClick={() => setEditingProfile(true)}>Edit</Button>}>
        <div className="space-y-4 p-6 text-sm"><ProfileRow label="Legal name" value={profile.legalName} /><ProfileRow label="Billing email" value={profile.billingEmail} /><ProfileRow label="GSTIN" value={profile.gstin || "Not provided"} /><ProfileRow label="PAN" value={profile.pan || "Not provided"} /><ProfileRow label="Currency" value={profile.currency} /><ProfileRow label="Address" value={addressText(profile)} /></div>
      </BillingPanel>
    </div>

    <BillingPanel title="Available plans" description="Preview server-calculated proration before committing a change">
      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">{subscription.availablePlans.map((plan) => <PlanCard current={plan.id === subscription.plan.id} key={plan.id} plan={plan} onChoose={() => { setPlanChoice(plan); setPreview(null); }} />)}</div>
    </BillingPanel>

    <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
      <BillingPanel title="Payment methods" description="Only provider-tokenized references are stored" action={<Button size="sm" className="bg-primary text-white" onClick={() => setAddingMethod(true)}><Plus />Add method</Button>}>
        <div className="divide-y divide-outline-variant">{methods.map((method) => <div className="flex items-center gap-4 p-5" key={method.id}><div className="grid size-11 place-items-center rounded-xl bg-zinc-50 text-primary"><CreditCard className="size-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{method.displayName}</strong>{method.isDefault && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800">DEFAULT</span>}</div><p className="mt-1 text-xs text-outline">{method.gateway} · {method.lastFour ? `•••• ${method.lastFour}` : method.methodType}</p></div><Button aria-label={`Remove ${method.displayName}`} variant="ghost" size="icon" onClick={() => void revokeMethod(method)}><Trash2 className="text-red-600" /></Button></div>)}{!methods.length && <div className="p-8 text-center text-sm text-outline">No payment method is attached.</div>}</div>
      </BillingPanel>
      <BillingPanel title="GST invoices" description="Immutable tax snapshots and private PDF downloads">
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-zinc-50 text-[10px] uppercase tracking-wider text-on-surface-variant"><tr><th className="p-4">Invoice</th><th className="p-4">Issued</th><th className="p-4">Amount</th><th className="p-4">Status</th><th className="p-4 text-right">Document</th></tr></thead><tbody className="divide-y divide-outline-variant">{invoices.map((invoice) => <tr key={invoice.id}><td className="p-4"><div className="font-semibold">{invoice.invoiceNumber}</div><div className="mt-1 text-xs text-outline">Due {formatBillingDate(invoice.dueDate)}</div></td><td className="p-4 text-on-surface-variant">{formatBillingDate(invoice.issuedAt)}</td><td className="p-4 font-semibold">{formatMoney(invoice.totalAmount, invoice.currency)}</td><td className="p-4"><StatusBadge status={invoice.status} /></td><td className="p-4 text-right"><Button variant="ghost" size="sm" disabled={!invoice.pdfChecksum || busy === invoice.id} onClick={() => void downloadInvoice(invoice)}><Download />PDF</Button></td></tr>)}</tbody></table>{!invoices.length && <div className="p-10 text-center text-sm text-outline">Invoices will appear here after a chargeable plan event.</div>}</div>
      </BillingPanel>
    </div>

    {editingProfile && <ProfileDialog profile={profile} busy={busy === "profile"} onClose={() => setEditingProfile(false)} onSave={saveProfile} />}
    {addingMethod && <PaymentMethodDialog busy={busy === "method"} onClose={() => setAddingMethod(false)} onSave={addMethod} />}
    {planChoice && <PlanDialog busy={busy === "plan"} current={subscription.plan} plan={planChoice} preview={preview} onClose={() => { setPlanChoice(null); setPreview(null); }} onPreview={previewPlan} onConfirm={confirmPlan} />}
  </BillingPage>;

  async function saveProfile(next: BillingProfile) {
    setBusy("profile"); setError("");
    try { await apiClient.patch("/billing/profile", next); setEditingProfile(false); setNotice("Billing profile updated. Future invoices will use the new snapshot."); await load(); }
    catch (cause) { setError(getApiErrorMessage(cause, "Billing profile could not be updated.")); }
    finally { setBusy(""); }
  }

  async function addMethod(value: { gateway: string; providerMethodRef: string; displayName: string; lastFour: string }) {
    setBusy("method"); setError("");
    try { await apiClient.post("/billing/payment-methods", { ...value, methodType: "CARD", isDefault: methods.length === 0 }); setAddingMethod(false); setNotice("Payment method attached securely."); await load(); }
    catch (cause) { setError(getApiErrorMessage(cause, "Payment method could not be attached.")); }
    finally { setBusy(""); }
  }

  async function revokeMethod(method: BillingPaymentMethod) {
    if (!window.confirm(`Remove ${method.displayName}?`)) return;
    setBusy(method.id); setError("");
    try { await apiClient.delete(`/billing/payment-methods/${method.id}`); setNotice("Payment method removed."); await load(); }
    catch (cause) { setError(getApiErrorMessage(cause, "Payment method could not be removed.")); }
    finally { setBusy(""); }
  }

  async function previewPlan(effective: "NOW" | "PERIOD_END") {
    if (!planChoice) return;
    setBusy("plan"); setError("");
    try { const { data } = await apiClient.post<{ data: { preview: PlanPreview } }>("/billing/subscription/change-plan", { planId: planChoice.id, effective, confirm: false }); setPreview(data.data.preview); }
    catch (cause) { setError(getApiErrorMessage(cause, "Plan preview could not be calculated.")); }
    finally { setBusy(""); }
  }

  async function confirmPlan(effective: "NOW" | "PERIOD_END") {
    if (!planChoice) return;
    setBusy("plan"); setError("");
    try { await apiClient.post("/billing/subscription/change-plan", { planId: planChoice.id, effective, confirm: true }); setPlanChoice(null); setPreview(null); setNotice(effective === "NOW" ? "Plan changed and the invoice was generated." : "Plan change scheduled for the end of the billing period."); await load(); }
    catch (cause) { setError(getApiErrorMessage(cause, "Plan change could not be completed.")); }
    finally { setBusy(""); }
  }

  async function downloadInvoice(invoice: BillingInvoice) {
    setBusy(invoice.id); setError("");
    try { const { data } = await apiClient.get<{ data: { url: string } }>(`/billing/invoices/${invoice.id}/download`); window.open(data.data.url, "_blank", "noopener,noreferrer"); }
    catch (cause) { setError(getApiErrorMessage(cause, "Invoice download could not be prepared.")); }
    finally { setBusy(""); }
  }
}

function ProfileRow({ label, value }: { label: string; value: string }) { return <div className="grid gap-1 border-b border-outline-variant pb-3 last:border-0 last:pb-0"><span className="text-[10px] font-bold uppercase tracking-wider text-outline">{label}</span><span className="leading-5 text-zinc-800">{value}</span></div>; }

function PlanCard({ plan, current, onChoose }: { plan: BillingPlan; current: boolean; onChoose: () => void }) {
  return <article className={`flex flex-col rounded-2xl border p-5 ${current ? "border-primary-container bg-zinc-50" : "border-surface-variant bg-white"}`}><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-bold">{plan.name}</h3><p className="mt-1 min-h-10 text-xs leading-5 text-outline">{plan.description}</p></div>{current && <StatusBadge status="ACTIVE" />}</div><div className="mt-5 text-2xl font-bold text-primary">{formatMoney(plan.pricePerUser, plan.currency)}<span className="text-xs font-medium text-outline"> / employee</span></div><div className="mt-4 flex flex-wrap gap-1.5">{plan.modules.map(({ module }) => <span className="rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-on-surface-variant" key={module.id}>{module.name}</span>)}</div><Button className="mt-6 w-full" variant={current ? "outline" : "default"} disabled={current} onClick={onChoose}>{current ? "Current plan" : "Review change"}<ArrowRight /></Button></article>;
}

function ProfileDialog({ profile, busy, onClose, onSave }: { profile: BillingProfile; busy: boolean; onClose: () => void; onSave: (profile: BillingProfile) => void }) {
  const [value, setValue] = useState({ ...profile, address: profile.address ?? { line1: "", city: "", state: "", postalCode: "", countryCode: "IN" } });
  return <Dialog title="Edit billing profile" description="Changes apply to future invoices only." onClose={onClose}><form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); onSave(value); }}><FormField label="Legal name"><Input required value={value.legalName} onChange={(event) => setValue({ ...value, legalName: event.target.value })} /></FormField><FormField label="Billing email"><Input required type="email" value={value.billingEmail} onChange={(event) => setValue({ ...value, billingEmail: event.target.value })} /></FormField><FormField label="GSTIN"><Input value={value.gstin ?? ""} onChange={(event) => setValue({ ...value, gstin: event.target.value.toUpperCase() })} /></FormField><FormField label="PAN"><Input value={value.pan ?? ""} onChange={(event) => setValue({ ...value, pan: event.target.value.toUpperCase() })} /></FormField><div className="sm:col-span-2"><FormField label="Address line"><Input required value={value.address.line1} onChange={(event) => setValue({ ...value, address: { ...value.address, line1: event.target.value } })} /></FormField></div><FormField label="City"><Input required value={value.address.city} onChange={(event) => setValue({ ...value, address: { ...value.address, city: event.target.value } })} /></FormField><FormField label="State"><Input required value={value.address.state} onChange={(event) => setValue({ ...value, address: { ...value.address, state: event.target.value } })} /></FormField><FormField label="Postal code"><Input required value={value.address.postalCode} onChange={(event) => setValue({ ...value, address: { ...value.address, postalCode: event.target.value } })} /></FormField><FormField label="Country"><Input required maxLength={2} value={value.address.countryCode} onChange={(event) => setValue({ ...value, address: { ...value.address, countryCode: event.target.value.toUpperCase() } })} /></FormField><div className="mt-3 flex justify-end gap-3 sm:col-span-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button className="bg-primary text-white" disabled={busy} type="submit">{busy ? "Saving..." : "Save profile"}</Button></div></form></Dialog>;
}

function PaymentMethodDialog({ busy, onClose, onSave }: { busy: boolean; onClose: () => void; onSave: (value: { gateway: string; providerMethodRef: string; displayName: string; lastFour: string }) => void }) {
  const [value, setValue] = useState({ gateway: "RAZORPAY", providerMethodRef: "", displayName: "Business card", lastFour: "" });
  return <Dialog title="Attach a payment method" description="Use the token returned by the provider-hosted secure checkout. DeltCRM never receives card or bank secrets." onClose={onClose}><form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); onSave(value); }}><FormField label="Payment provider"><select className="h-10 rounded-md border border-input bg-transparent px-3 text-sm" value={value.gateway} onChange={(event) => setValue({ ...value, gateway: event.target.value })}><option value="RAZORPAY">Razorpay</option><option value="STRIPE">Stripe</option></select></FormField><FormField label="Provider payment-method token"><Input required minLength={6} placeholder="Token from secure provider checkout" value={value.providerMethodRef} onChange={(event) => setValue({ ...value, providerMethodRef: event.target.value })} /></FormField><FormField label="Display name"><Input required value={value.displayName} onChange={(event) => setValue({ ...value, displayName: event.target.value })} /></FormField><FormField label="Last four digits"><Input required inputMode="numeric" maxLength={4} pattern="[0-9]{4}" value={value.lastFour} onChange={(event) => setValue({ ...value, lastFour: event.target.value.replace(/\D/g, "") })} /></FormField><div className="mt-3 flex justify-end gap-3"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button className="bg-primary text-white" disabled={busy} type="submit">{busy ? "Attaching..." : "Attach securely"}</Button></div></form></Dialog>;
}

function PlanDialog({ current, plan, preview, busy, onClose, onPreview, onConfirm }: { current: BillingPlan; plan: BillingPlan; preview: PlanPreview | null; busy: boolean; onClose: () => void; onPreview: (timing: "NOW" | "PERIOD_END") => void; onConfirm: (timing: "NOW" | "PERIOD_END") => void }) {
  const [timing, setTiming] = useState<"NOW" | "PERIOD_END">("PERIOD_END");
  return <Dialog title={`Change to ${plan.name}`} description="The server validates employee limits, module dependencies and calculates proration." onClose={onClose}><div className="grid gap-4"><div className="grid gap-3 sm:grid-cols-2"><PlanSummary label="Current" plan={current} /><PlanSummary label="Target" plan={plan} /></div><label className="grid gap-2 text-sm font-semibold">Effective timing<select className="h-11 rounded-lg border border-zinc-300 bg-white px-3" value={timing} onChange={(event) => { setTiming(event.target.value as "NOW" | "PERIOD_END"); }}><option value="PERIOD_END">At period end</option><option value="NOW">Immediately with proration</option></select></label>{preview ? <div className="rounded-xl bg-zinc-50 p-5"><div className="grid grid-cols-2 gap-4 text-sm"><ProfileRow label="Current amount" value={formatMoney(preview.currentAmount, preview.currency)} /><ProfileRow label="Target amount" value={formatMoney(preview.targetAmount, preview.currency)} /><ProfileRow label="Amount due" value={formatMoney(preview.amountDue, preview.currency)} /><ProfileRow label="Credit" value={formatMoney(preview.creditAmount, preview.currency)} /></div></div> : <BillingNotice>Preview the change before confirming. No client-provided totals are accepted.</BillingNotice>}<div className="flex justify-end gap-3"><Button variant="outline" disabled={busy} onClick={() => onPreview(timing)}>{busy ? "Calculating..." : "Calculate preview"}</Button><Button className="bg-primary text-white" disabled={busy || !preview} onClick={() => onConfirm(timing)}>Confirm change</Button></div></div></Dialog>;
}

function PlanSummary({ label, plan }: { label: string; plan: BillingPlan }) { return <div className="rounded-xl border border-surface-variant p-4"><div className="text-[10px] font-bold uppercase tracking-wider text-outline">{label}</div><div className="mt-2 font-bold">{plan.name}</div><div className="mt-1 text-sm text-primary">{formatMoney(plan.pricePerUser, plan.currency)} / seat</div></div>; }

function Dialog({ title, description, onClose, children }: { title: string; description: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/45 p-4"><section className="my-6 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-6 flex items-start gap-4"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-zinc-50 text-primary"><ShieldCheck /></div><div><h2 className="text-xl font-bold">{title}</h2><p className="mt-1 text-sm leading-5 text-on-surface-variant">{description}</p></div><button aria-label="Close dialog" className="ml-auto text-2xl text-outline" onClick={onClose}>×</button></div>{children}</section></div>; }

function FormField({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-2 text-sm font-semibold text-zinc-800"><span>{label}</span>{children}</label>; }

function addressText(profile: BillingProfile) { const address = profile.address; return address ? [address.line1, address.line2, address.city, address.state, address.postalCode, address.countryCode].filter(Boolean).join(", ") : "Not provided"; }
