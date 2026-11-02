"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight, CheckCircle2, CreditCard, ExternalLink, FileText, IndianRupee, Landmark, Receipt, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Avatar, Card, KV, StatCard, StatusBadge } from "@/components/ui/card";
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

const methods = [
  { id: "upi", label: "UPI Instant", icon: Smartphone, desc: "GPay, PhonePe, Paytm" },
  { id: "card", label: "Debit / Credit Card", icon: CreditCard, desc: "Visa, Mastercard, RuPay" },
  { id: "netbanking", label: "Net Banking", icon: Landmark, desc: "All Indian banks" },
] as const;

const upiSchema = z.object({
  upi: z.string().regex(/^[\w.-]{2,}@[a-zA-Z]{2,}$/, "Enter a valid UPI ID (e.g., yourname@okhdfcbank)"),
});

function Checkout({
  payment,
  onClose,
  onDone,
}: {
  payment: Payment | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [method, setMethod] = useState<(typeof methods)[number]["id"]>("upi");
  const [state, setState] = useState<"idle" | "processing" | "success" | "failed">("idle");
  const [reason, setReason] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<{ upi: string }>({ resolver: zodResolver(upiSchema), defaultValues: { upi: "" } });

  const markPaid = useAction(
    (id: string) => api.post(`/payments/${id}/pay`).then(() => api.post(`/payments/${id}/document`, { kind: "receipt" })),
    ["payments", "invoices", "appointments"]
  );

  const close = () => {
    setState("idle");
    reset();
    onClose();
  };

  const run = async (upi?: string) => {
    if (!payment) return;
    setState("processing");
    const order = await providers.payment.createOrder(payment.id, payment.amount);
    const res = await providers.payment.checkout(order, method, upi);
    if (res.status === "success") {
      await markPaid.mutateAsync(payment.id);
      setState("success");
      onDone();
    } else {
      setReason(res.reason ?? "Payment could not be completed.");
      setState("failed");
    }
  };

  return (
    <Modal
      open={!!payment}
      onClose={close}
      title="Secure Checkout"
      description={`Pay ${payment ? money(payment.amount) : ""} to ${payment?.therapistName ?? "Clinic"}`}
      className="w-[min(480px,96vw)]"
    >
      {state === "success" ? (
        <div className="py-6 text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-mint text-ok shadow-sm">
            <CheckCircle2 className="size-8" />
          </div>
          <h3 className="text-lg font-extrabold text-ink">Payment Successful!</h3>
          <p className="mt-1.5 text-xs text-muted max-w-xs mx-auto">
            Your consultation has been confirmed and a tax invoice receipt has been automatically issued to your account.
          </p>
          <div className="mt-4 rounded-xl border border-line bg-gradient-to-r from-warm-ivory to-white p-3 text-xs font-semibold text-ink">
            Amount Paid: <span className="text-wine font-extrabold">{payment ? money(payment.amount) : ""}</span>
          </div>
          <Button className="mt-5 w-full" size="lg" onClick={close}>
            Return to Dashboard
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {methods.map((m) => {
              const active = method === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  aria-pressed={active}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-all",
                    active
                      ? "border-wine bg-gradient-to-b from-rose/80 to-rose/30 text-wine shadow-xs"
                      : "border-line bg-white hover:border-wine/30"
                  )}
                >
                  <m.icon className="size-5" />
                  <div className="text-[11px] font-bold">{m.label}</div>
                  <div className="text-[9px] text-muted leading-tight">{m.desc}</div>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit((v) => run(v.upi))} noValidate className="space-y-4 pt-1">
            {method === "upi" ? (
              <div className="space-y-2">
                <Input
                  label="UPI ID"
                  placeholder="e.g. yourname@okhdfcbank"
                  leading={<Smartphone className="size-4 text-wine" />}
                  error={errors.upi?.message}
                  {...register("upi")}
                />
                <p className="text-[10px] text-muted">Supports all major UPI apps including Google Pay, PhonePe, Paytm, and BHIM.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-line bg-warm-ivory p-3.5 text-xs text-muted flex items-center gap-3">
                <ShieldCheck className="size-5 text-wine shrink-0" />
                <span>
                  You will be securely redirected to your {method === "card" ? "card issuer" : "bank"} 3D Secure portal (simulated in demo mode).
                </span>
              </div>
            )}

            {state === "failed" && (
              <p role="alert" className="rounded-xl border border-bad/20 bg-coral p-3 text-xs font-semibold text-bad">
                {reason}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={state === "processing"}
            >
              Pay {payment ? money(payment.amount) : ""} Securely
            </Button>
          </form>

          <div className="flex items-center justify-center gap-2 pt-1 text-[10px] text-muted">
            <ShieldCheck className="size-3 text-ok" />
            <span>256-Bit SSL Encrypted via {providers.payment.name}. Payment credentials are never stored.</span>
          </div>
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
  const base: Record<string, string | undefined> =
    role === "therapist" ? { therapistId: user?.id } : role === "client" ? { clientId: user?.id } : {};
  const all = useList("payments", base);
  const invoices = useList("invoices", {});
  const invoiceFor = (p: Payment) => invoices.data?.find((i) => i.paymentId === p.id);
  const doc = useAction(
    (v: { id: string; kind: Invoice["kind"] }) => api.post<Invoice>(`/payments/${v.id}/document`, { kind: v.kind }),
    ["invoices", "payments"]
  );
  const record = useAction(
    (id: string) => api.post(`/payments/${id}/pay`).then(() => api.post(`/payments/${id}/document`, { kind: "receipt" })),
    ["payments", "invoices", "appointments"]
  );

  const sum = (s: Payment["status"]) => (all.data ?? []).filter((p) => p.status === s).reduce((a, p) => a + p.amount, 0);
  const staff = role !== "client";
  const inv = sel ? invoiceFor(sel) : undefined;

  const issue = async (kind: Invoice["kind"]) => {
    try {
      const n = await doc.mutateAsync({ id: sel!.id, kind });
      toast(`${n.kind === "receipt" ? "Receipt" : "Tax invoice"} ${n.no} issued successfully`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not issue document", "error");
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Financial Operations"
        title="Billing & Payments"
        subtitle={
          role === "client"
            ? "Pay securely for your therapeutic sessions and download official GST invoices and receipts."
            : "Monitor cash collections, reconcile pending dues and issue official receipts or tax invoices."
        }
      />

      <StaggerGrid className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          label={role === "therapist" ? "Earnings Received" : role === "client" ? "Total Paid" : "Total Collected"}
          value={money(sum("paid"))}
          tone="mint"
          icon={<IndianRupee className="size-4" />}
        />
        <StatCard
          label={role === "client" ? "Outstanding Due" : "Pending Collections"}
          value={money(sum("pending"))}
          tone="coral"
          up={false}
          icon={<CreditCard className="size-4" />}
        />
        <StatCard
          label="Failed / Unresolved"
          value={money(sum("failed"))}
          tone="lavender"
          up={false}
          icon={<Receipt className="size-4" />}
        />
      </StaggerGrid>

      <DataTable
        resource="payments"
        baseParams={base}
        searchPlaceholder="Search by transaction ID, client or clinician…"
        onRowClick={setSel}
        defaultSort={{ key: "date", dir: "desc" }}
        filters={[
          {
            key: "status",
            label: "Status",
            options: ["paid", "pending", "failed"].map((v) => ({
              value: v,
              label: v[0].toUpperCase() + v.slice(1),
            })),
          },
          {
            key: "method",
            label: "Payment Method",
            options: ["UPI", "Card", "Netbanking", "Cash"].map((v) => ({ value: v, label: v })),
          },
        ]}
        emptyTitle="No payments found"
        emptyDescription="Transactions will appear here once consultations are billed."
        columns={[
          {
            key: "date",
            header: "Date & Time",
            sortable: true,
            render: (p: Payment) => (
              <div>
                <div className="font-semibold text-ink">{fmtDate(p.date)}</div>
                <div className="font-mono text-[10px] text-muted">{p.txn}</div>
              </div>
            ),
          },
          ...(role !== "client"
            ? [
                {
                  key: "clientName",
                  header: "Client",
                  sortable: true,
                  render: (p: Payment) => (
                    <div className="flex items-center gap-2">
                      <Avatar name={p.clientName} size={24} />
                      <span className="font-medium text-ink/90">{p.clientName}</span>
                    </div>
                  ),
                },
              ]
            : []),
          ...(role !== "therapist"
            ? [
                {
                  key: "therapistName",
                  header: "Therapist",
                  hideBelow: "lg" as const,
                  render: (p: Payment) => (
                    <div className="flex items-center gap-2">
                      <Avatar name={p.therapistName} size={24} />
                      <span className="font-medium text-ink/90">{p.therapistName}</span>
                    </div>
                  ),
                },
              ]
            : []),
          {
            key: "method",
            header: "Method",
            hideBelow: "sm" as const,
            render: (p: Payment) => (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warm-ivory px-2.5 py-0.5 text-[11px] font-semibold text-ink border border-line">
                {p.method === "UPI" ? <Smartphone className="size-3 text-wine" /> : <CreditCard className="size-3 text-info" />}
                {p.method}
              </span>
            ),
          },
          {
            key: "amount",
            header: "Amount",
            sortable: true,
            render: (p: Payment) => <span className="font-extrabold text-ink">{money(p.amount)}</span>,
          },
          {
            key: "status",
            header: "Status",
            sortable: true,
            render: (p: Payment) => <StatusBadge status={p.status} />,
          },
          {
            key: "doc",
            header: "Tax Doc",
            hideBelow: "lg" as const,
            render: (p: Payment) => {
              const i = invoiceFor(p);
              return i ? (
                <Link
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 font-bold text-wine hover:underline text-xs"
                  href={`${backInvoice}/${i.id}`}
                >
                  <FileText className="size-3" />
                  {i.no}
                </Link>
              ) : (
                <span className="text-muted">—</span>
              );
            },
          },
        ]}
      />

      <Drawer
        open={!!sel}
        onClose={() => setSel(null)}
        title={sel ? money(sel.amount) : ""}
        description={`Transaction Reference: ${sel?.txn ?? ""}`}
        footer={
          sel && (
            <>
              {sel.status !== "paid" && role === "client" && (
                <Button
                  icon={<CreditCard className="size-3.5" />}
                  onClick={() => {
                    setPay(sel);
                    setSel(null);
                  }}
                >
                  Pay Now ({money(sel.amount)})
                </Button>
              )}
              {sel.status !== "paid" && staff && (
                <Button
                  loading={record.isPending}
                  onClick={async () => {
                    try {
                      await record.mutateAsync(sel.id);
                      toast("Payment recorded and receipt automatically issued");
                      setSel(null);
                    } catch {
                      toast("Could not record payment", "error");
                    }
                  }}
                >
                  Record Payment Received
                </Button>
              )}
            </>
          )
        }
      >
        {sel && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <StatusBadge status={sel.status} />
              <span className="text-xs font-semibold text-muted">{fmtDateTime(sel.date)}</span>
            </div>

            <Card hover={false} variant="ivory" className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <KV label="Client">{sel.clientName}</KV>
                <KV label="Therapist">{sel.therapistName}</KV>
                <KV label="Payment Method">{sel.method}</KV>
                <KV label="Total Amount">{money(sel.amount)}</KV>
              </div>
            </Card>

            <div className="border-t border-line pt-4">
              <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-muted">
                Receipts & Tax Invoices
              </h3>
              {sel.status !== "paid" ? (
                <p className="text-xs text-muted">Official GST documents will be generated after payment completion.</p>
              ) : inv ? (
                <Card hover={false} className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-xl bg-rose text-wine font-bold">
                      <Receipt className="size-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-ink">{inv.no}</div>
                      <div className="text-[10px] text-muted">
                        {inv.kind === "receipt" ? "Payment Receipt" : "Tax Invoice"} · {money(inv.total)}
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`${backInvoice}/${inv.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-wine hover:underline"
                  >
                    View Document <ArrowUpRight className="size-3.5" />
                  </Link>
                </Card>
              ) : (
                <p className="text-xs text-muted">No document issued yet.</p>
              )}

              {sel.status === "paid" && staff && (
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Receipt className="size-3.5" />}
                    loading={doc.isPending}
                    disabled={inv?.kind === "receipt"}
                    onClick={() => issue("receipt")}
                  >
                    Issue Receipt
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<FileText className="size-3.5" />}
                    loading={doc.isPending}
                    disabled={inv?.kind === "tax_invoice"}
                    onClick={() => issue("tax_invoice")}
                  >
                    Issue Tax Invoice
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      <Checkout payment={pay} onClose={() => setPay(null)} onDone={() => toast("Payment completed successfully")} />
    </>
  );
}
