"use client";
import { Ban, CheckCircle2, Download, FileText, Mail, Receipt, Send, Sparkles } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { SectionCard, KV, StatusBadge, Card } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { useConfirm } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";
import { useAction, useItem, useUpdate } from "@/hooks/useResource";
import { fmtDateTime } from "@/lib/format";
import { api } from "@/services/api";
import { providers } from "@/services/providers/registry";
import type { Invoice, Role } from "@/services/types";
import { FormDialog } from "./form-dialog";
import { InvoiceDocument } from "./invoice-document";

const emailSchema = z.object({
  to: z.string().email("Enter a valid recipient email address"),
  message: z.string().optional(),
});

export function InvoiceDetail({ role, backHref }: { role: Role; backHref: string }) {
  const { id } = useParams<{ id: string }>();
  const q = useItem("invoices", id);
  const inv = q.data;
  const { toast } = useToast();
  const confirm = useConfirm();
  const update = useUpdate("invoices", ["payments"]);
  const email = useAction((v: { id: string }) => api.post<Invoice>(`/invoices/${v.id}/email`), ["invoices"]);
  const doc = useAction(
    (v: { paymentId: string; kind: Invoice["kind"] }) => api.post<Invoice>(`/payments/${v.paymentId}/document`, { kind: v.kind }),
    ["invoices", "payments"]
  );
  const [pdfBusy, setPdfBusy] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  const staff = role !== "client";

  const pdf = async () => {
    if (!inv) return;
    setPdfBusy(true);
    try {
      const r = await api.post<{ filename: string }>(`/invoices/${inv.id}/pdf`);
      toast(`Preparing ${r.filename} — choose "Save as PDF" in the browser print dialog`, "info");
      setTimeout(() => window.print(), 400);
    } catch {
      toast("Could not generate PDF document", "error");
    } finally {
      setPdfBusy(false);
    }
  };

  const setStatus = async (status: Invoice["status"], title: string, danger = false) => {
    if (
      !inv ||
      !(await confirm({
        title,
        description: danger
          ? "Voided invoices cannot be modified, settled, or restored."
          : "The client's payment and document status will be updated immediately.",
        confirmLabel: title,
        danger,
      }))
    )
      return;
    try {
      await update.mutateAsync({
        id: inv.id,
        status,
        paymentStatus: status === "paid" ? "paid" : inv.paymentStatus,
      });
      toast(`Invoice marked as ${status}`);
    } catch {
      toast("Could not update invoice status", "error");
    }
  };

  const convert = async (kind: Invoice["kind"]) => {
    if (!inv?.paymentId) return;
    if (
      !(await confirm({
        title: `Issue as ${kind === "tax_invoice" ? "official tax invoice" : "payment receipt"}?`,
        description: "A newly allocated document number will be assigned from the clinic's configured serial series.",
        confirmLabel: "Issue Document",
      }))
    )
      return;
    try {
      const n = await doc.mutateAsync({ paymentId: inv.paymentId, kind });
      toast(`Successfully issued document ${n.no}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not issue document", "error");
    }
  };

  if (q.isError)
    return <ErrorState message="This invoice could not be located or loaded." onRetry={() => q.refetch()} />;

  return (
    <>
      <div className="no-print">
        <PageHeader
          back={{ href: backHref, label: "All Invoices" }}
          eyebrow={inv?.kind === "tax_invoice" ? "Tax Invoice" : "Payment Receipt"}
          title={inv?.no ?? "Loading Document…"}
          subtitle={inv ? `Client: ${inv.clientName} · Clinician: ${inv.therapistName}` : undefined}
          actions={
            inv && (
              <>
                <Button variant="outline" icon={<Download className="size-3.5" />} loading={pdfBusy} onClick={pdf}>
                  Download PDF
                </Button>
                {staff && (
                  <Button icon={<Mail className="size-3.5" />} onClick={() => setMailOpen(true)}>
                    Email to Client
                  </Button>
                )}
              </>
            )
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.75fr_1fr]">
        {!inv ? <Skeleton className="h-[520px] rounded-2xl" /> : <InvoiceDocument invoice={inv} />}

        <div className="no-print space-y-5">
          <SectionCard title="Lifecycle & Audit Status">
            {!inv ? (
              <Skeleton className="h-32" />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={inv.status} />
                  <StatusBadge status={inv.paymentStatus} label={`Payment: ${inv.paymentStatus}`} />
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  <KV label="Emailed Delivery">{inv.emailedAt ? fmtDateTime(inv.emailedAt) : "Not yet sent"}</KV>
                  <KV label="Payment Reference">{inv.paymentId ?? "—"}</KV>
                </div>
                {staff && inv.status !== "void" && (
                  <div className="flex flex-wrap gap-2 border-t border-line/60 pt-3.5">
                    {inv.paymentStatus !== "paid" && (
                      <Button size="sm" icon={<CheckCircle2 className="size-3.5" />} onClick={() => setStatus("paid", "Mark as paid")}>
                        Mark Paid
                      </Button>
                    )}
                    {inv.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => setStatus("sent", "Mark as sent")}>
                        Mark Sent
                      </Button>
                    )}
                    {role === "admin" && (
                      <Button size="sm" variant="danger" icon={<Ban className="size-3.5" />} onClick={() => setStatus("void", "Void Invoice", true)}>
                        Void Document
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {staff && inv?.paymentId && inv.paymentStatus === "paid" && (
            <SectionCard title="Document Type Conversion" action={<span className="text-[10px] text-muted">DPDPA & GST Compliant</span>}>
              <p className="mb-3.5 text-xs text-muted">
                Switch or re-issue this settled transaction as either a formal payment receipt or a full GST tax invoice.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <Button
                  size="sm"
                  variant={inv.kind === "receipt" ? "primary" : "outline"}
                  icon={<Receipt className="size-3.5" />}
                  loading={doc.isPending}
                  disabled={inv.kind === "receipt"}
                  onClick={() => convert("receipt")}
                >
                  Payment Receipt
                </Button>
                <Button
                  size="sm"
                  variant={inv.kind === "tax_invoice" ? "primary" : "outline"}
                  icon={<FileText className="size-3.5" />}
                  loading={doc.isPending}
                  disabled={inv.kind === "tax_invoice"}
                  onClick={() => convert("tax_invoice")}
                >
                  GST Tax Invoice
                </Button>
              </div>
            </SectionCard>
          )}

          <Card hover={false} variant="rose" className="p-4 text-xs">
            <div className="flex items-center gap-2 font-bold text-wine">
              <Sparkles className="size-3.5" />
              Automated Document Numbering
            </div>
            <p className="mt-1 text-[11px] text-muted leading-relaxed">
              Receipts and tax invoices are automatically tracked against the sequential series configured in your clinic settings.
            </p>
          </Card>
        </div>
      </div>

      <FormDialog<{ to: string; message?: string }>
        open={mailOpen}
        onClose={() => setMailOpen(false)}
        title="Email Invoice to Client"
        description={`Document #${inv?.no} will be dispatched as a secure PDF link.`}
        submitLabel="Send Document"
        fields={[
          { name: "to", label: "Recipient Email Address", type: "email", span: 2 },
          { name: "message", label: "Custom Message (optional)", type: "textarea" },
        ]}
        schema={emailSchema}
        defaultValues={{ to: inv?.clientEmail ?? "", message: "" } as never}
        successMessage="Invoice email dispatched to client"
        onSubmit={async (v) => {
          await providers.notification.send({ channel: "email", to: v.to, template: inv?.kind ?? "invoice" });
          await email.mutateAsync({ id: inv!.id });
        }}
      />
    </>
  );
}
