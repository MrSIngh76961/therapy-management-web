"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, CreditCard, FileText, IndianRupee, Landmark, Receipt, Smartphone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, KV, StatCard, StatusBadge } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Drawer, Modal } from "@/components/ui/overlay";
import { Input } from "@/components/ui/form";
import { PageHeader, StaggerGrid } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { useAction, useList } from "@/hooks/useResource";
import { cn } from "@/lib/cn";
import { fmtDate, fmtDateTime, money } from "@/lib/format";
import { api } from "@/services/api";
import { providers } from "@/services/providers/registry";
import type { Invoice, Payment, Role } from "@/services/types";
import { useForm } from "react-hook-form";
import { z } from "zod";

const methods = [{ id: "upi", label: "UPI", icon: Smartphone }, { id: "card", label: "Card", icon: CreditCard }, { id: "netbanking", label: "Net banking", icon: Landmark }] as const;
const upiSchema = z.object({ upi: z.string().regex(/^[\w.-]{2,}@[a-zA-Z]{2,}$/, "Enter a valid UPI ID, e.g. name@okbank") });

function Checkout({ payment, onClose, onDone }: { payment: Payment | null; onClose: () => void; onDone: () => void }) {
  const [method, setMethod] = useState<(typeof methods)[number]["id"]>("upi");
  const [state, setState] = useState<"idle" | "processing" | "success" | "failed">("idle");
  const [reason, setReason] = useState("");
  const { register, handleSubmit, formState: { errors }, reset } = useForm<{ upi: string }>({ resolver: zodResolver(upiSchema), defaultValues: { upi: "" } });
  const markPaid = useAction((id: string) => api.post(`/payments/${id}/pay`).then(() => api.post(`/payments/${id}/document`, { kind: "receipt" })), ["payments", "invoices", "appointments"]);
  const close = () => { setState("idle"); reset(); onClose(); };
  const run = async (upi?: string) => {
    if (!payment) return;
    setState("processing");
    const order = await providers.payment.createOrder(payment.id, payment.amount);
    const res = await providers.payment.checkout(order, method, upi);
    if (res.status === "success") { await markPaid.mutateAsync(payment.id); setState("success"); onDone(); }
    else { setReason(res.reason ?? "Payment could not be completed."); setState("failed"); }
  };
  return (
    <Modal open={!!payment} onClose={close} title="Secure checkout" description={`Pay ${payment ? money(payment.amount) : ""} to ${payment?.therapistName ?? ""}`} className="w-[min(460px,96vw)]">
      {state === "success" ? (
        <div className="py-4 text-center"><div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-[#e9f7f0] text-ok"><CheckCircle2 className="size-7" /></div><h3 className="font-extrabold">Payment successful</h3><p className="mt-1 text-xs text-muted">Your payment receipt has been generated and is available under Payments.</p><Button className="mt-4" onClick={close}>Done</Button></div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {methods.map((m) => <button key={m.id} onClick={() => setMethod(m.id)} aria-pressed={method === m.id} className={cn("flex flex-col items-center gap-1 rounded-xl border p-3 text-[11px] font-bold transition-all", method === m.id ? "border-wine bg-rose text-wine" : "border-line hover:border-[#d9bbc4]")}><m.icon className="size-5" />{m.label}</button>)}
          </div>
          <form onSubmit={handleSubmit((v) => run(v.upi))} noValidate className="space-y-3">
            {method === "upi" ? <Input label="UPI ID" placeholder="name@okbank" error={errors.upi?.message} {...register("upi")} /> : <p className="rounded-xl bg-[#faf7f8] p-3 text-xs text-muted">You will be redirected to your {method === "card" ? "card" : "bank"} page by the payment provider (simulated).</p>}
            {state === "failed" && <p role="alert" className="rounded-lg bg-[#fdecee] px-3 py-2 text-xs font-semibold text-bad">{reason}</p>}
            {method === "upi" ? <Button type="submit" className="w-full" size="lg" loading={state === "processing"}>Pay {payment ? money(payment.amount) : ""}</Button> : <Button className="w-full" size="lg" loading={state === "processing"} onClick={() => run()}>Pay {payment ? money(payment.amount) : ""}</Button>}
          </form>
          <p className="text-center text-[10px] text-muted">Processed via {providers.payment.name}. Card details never touch this app.</p>
        </div>
      )}
    </Modal>
  );
}

export function PaymentsView({ role, backInvoice }: { role: Role; backInvoice: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sel, setSel] = useState<Payment | null>(null);
  const [pay, setPay] = useState<Payment | null>(null);
  const base: Record<string, string | undefined> = role === "therapist" ? { therapistId: user?.id } : role === "client" ? { clientId: user?.id } : {};
  const all = useList("payments", base);
  const invoices = useList("invoices", {});
  const invoiceFor = (p: Payment) => invoices.data?.find((i) => i.paymentId === p.id);
  const doc = useAction((v: { id: string; kind: Invoice["kind"] }) => api.post<Invoice>(`/payments/${v.id}/document`, { kind: v.kind }), ["invoices", "payments"]);
  const record = useAction((id: string) => api.post(`/payments/${id}/pay`).then(() => api.post(`/payments/${id}/document`, { kind: "receipt" })), ["payments", "invoices", "appointments"]);
  const sum = (s: Payment["status"]) => (all.data ?? []).filter((p) => p.status === s).reduce((a, p) => a + p.amount, 0);
  const staff = role !== "client";
  const inv = sel ? invoiceFor(sel) : undefined;

  const issue = async (kind: Invoice["kind"]) => { try { const n = await doc.mutateAsync({ id: sel!.id, kind }); toast(`${n.kind === "receipt" ? "Receipt" : "Tax invoice"} ${n.no} issued`); } catch (e) { toast(e instanceof Error ? e.message : "Could not issue document", "error"); } };

  return (
    <>
      <PageHeader eyebrow="Finance" title="Payments" subtitle={role === "client" ? "Pay for sessions and download your receipts." : "Track collections, pending dues and issue receipts or tax invoices."} />
      <StaggerGrid className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label={role === "therapist" ? "Earnings received" : role === "client" ? "Total paid" : "Collected"} value={money(sum("paid"))} icon={<IndianRupee className="size-4" />} />
        <StatCard label={role === "client" ? "Due now" : "Pending"} value={money(sum("pending"))} up={false} icon={<CreditCard className="size-4" />} />
        <StatCard label="Failed attempts" value={money(sum("failed"))} up={false} icon={<Receipt className="size-4" />} />
      </StaggerGrid>
      <DataTable resource="payments" baseParams={base} searchPlaceholder="Search transaction, client or therapist…" onRowClick={setSel} defaultSort={{ key: "date", dir: "desc" }}
        initialFilters={undefined}
        filters={[{ key: "status", label: "Status", options: ["paid", "pending", "failed"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })) }, { key: "method", label: "Method", options: ["UPI", "Card", "Netbanking", "Cash"].map((v) => ({ value: v, label: v })) }]}
        emptyTitle="No payments yet" emptyDescription="Payments appear after sessions are billed."
        columns={[
          { key: "date", header: "Date", sortable: true, render: (p: Payment) => fmtDate(p.date) },
          { key: "txn", header: "Transaction", hideBelow: "md", render: (p: Payment) => <span className="font-mono text-[10px]">{p.txn}</span> },
          ...(role !== "client" ? [{ key: "clientName", header: "Client", sortable: true }] : []),
          ...(role !== "therapist" ? [{ key: "therapistName", header: "Therapist", hideBelow: "lg" as const }] : []),
          { key: "method", header: "Method", hideBelow: "sm" as const },
          { key: "amount", header: "Amount", sortable: true, render: (p: Payment) => <b>{money(p.amount)}</b> },
          { key: "status", header: "Status", sortable: true, render: (p: Payment) => <StatusBadge status={p.status} /> },
          { key: "doc", header: "Document", hideBelow: "lg" as const, render: (p: Payment) => { const i = invoiceFor(p); return i ? <Link onClick={(e) => e.stopPropagation()} className="font-bold text-wine hover:underline" href={`${backInvoice}/${i.id}`}>{i.no}</Link> : <span className="text-muted">—</span>; } },
        ]} />
      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel ? money(sel.amount) : ""} description={sel?.txn}
        footer={sel && <>
          {sel.status !== "paid" && role === "client" && <Button icon={<CreditCard className="size-3.5" />} onClick={() => { setPay(sel); setSel(null); }}>Pay now</Button>}
          {sel.status !== "paid" && staff && <Button loading={record.isPending} onClick={async () => { try { await record.mutateAsync(sel.id); toast("Payment recorded and receipt generated"); setSel(null); } catch { toast("Could not record payment", "error"); } }}>Record payment</Button>}
        </>}>
        {sel && (
          <div className="space-y-5">
            <StatusBadge status={sel.status} />
            <div className="grid grid-cols-2 gap-4"><KV label="Client">{sel.clientName}</KV><KV label="Therapist">{sel.therapistName}</KV><KV label="Method">{sel.method}</KV><KV label="Date">{fmtDateTime(sel.date)}</KV></div>
            <div className="border-t border-line pt-4">
              <h3 className="mb-2 text-xs font-extrabold">Receipt & invoice</h3>
              {sel.status !== "paid" ? <p className="text-xs text-muted">Documents are generated after a successful payment.</p> : inv ? (
                <Card hover={false} className="flex items-center justify-between gap-3 p-3"><div><div className="text-xs font-bold">{inv.no}</div><div className="text-[10px] text-muted">{inv.kind === "receipt" ? "Payment receipt" : "Tax invoice"} · {money(inv.total)}</div></div><Link href={`${backInvoice}/${inv.id}`} className="text-xs font-bold text-wine hover:underline">Open</Link></Card>
              ) : <p className="text-xs text-muted">No document issued yet.</p>}
              {sel.status === "paid" && staff && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" icon={<Receipt className="size-3.5" />} loading={doc.isPending} disabled={inv?.kind === "receipt"} onClick={() => issue("receipt")}>Issue receipt</Button>
                  <Button size="sm" variant="outline" icon={<FileText className="size-3.5" />} loading={doc.isPending} disabled={inv?.kind === "tax_invoice"} onClick={() => issue("tax_invoice")}>Issue tax invoice</Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
      <Checkout payment={pay} onClose={() => setPay(null)} onDone={() => toast("Payment successful")} />
    </>
  );
}