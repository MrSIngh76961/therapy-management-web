"use client";
import { Ban, CheckCircle2, Download, FileText, Mail, Receipt } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { SectionCard, KV, StatusBadge } from "@/components/ui/card";
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

const emailSchema = z.object({ to: z.string().email("Enter a valid email"), message: z.string().optional() });

export function InvoiceDetail({ role, backHref }: { role: Role; backHref: string }) {
  const { id } = useParams<{ id: string }>();
  const q = useItem("invoices", id);
  const inv = q.data;
  const { toast } = useToast(), confirm = useConfirm();
  const update = useUpdate("invoices", ["payments"]);
  const email = useAction((v: { id: string }) => api.post<Invoice>(`/invoices/${v.id}/email`), ["invoices"]);
  const doc = useAction((v: { paymentId: string; kind: Invoice["kind"] }) => api.post<Invoice>(`/payments/${v.paymentId}/document`, { kind: v.kind }), ["invoices", "payments"]);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  const staff = role !== "client";

  const pdf = async () => {
    if (!inv) return;
    setPdfBusy(true);
    try { const r = await api.post<{ filename: string }>(`/invoices/${inv.id}/pdf`); toast(`Preparing ${r.filename} — choose "Save as PDF" in the print dialog`, "info"); setTimeout(() => window.print(), 400); }
    catch { toast("Could not generate PDF", "error"); } finally { setPdfBusy(false); }
  };
  const setStatus = async (status: Invoice["status"], title: string, danger = false) => {
    if (!inv || !(await confirm({ title, description: danger ? "Voided invoices cannot be edited or paid." : "The client's payment status will be updated.", confirmLabel: title, danger }))) return;
    try { await update.mutateAsync({ id: inv.id, status, paymentStatus: status === "paid" ? "paid" : inv.paymentStatus }); toast(`Invoice marked ${status}`); } catch { toast("Could not update invoice", "error"); }
  };
  const convert = async (kind: Invoice["kind"]) => {
    if (!inv?.paymentId) return;
    if (!(await confirm({ title: `Issue as ${kind === "tax_invoice" ? "tax invoice" : "payment receipt"}?`, description: "A new document number is allocated from the configured series.", confirmLabel: "Issue document" }))) return;
    try { const n = await doc.mutateAsync({ paymentId: inv.paymentId, kind }); toast(`Issued ${n.no}`); } catch (e) { toast(e instanceof Error ? e.message : "Could not issue document", "error"); }
  };

  if (q.isError) return <ErrorState message="This invoice could not be loaded." onRetry={() => q.refetch()} />;
  return (
    <>
      <div className="no-print"><PageHeader back={{ href: backHref, label: "All invoices" }} eyebrow={inv?.kind === "tax_invoice" ? "Tax invoice" : "Payment receipt"} title={inv?.no ?? "Loading…"} subtitle={inv ? `${inv.clientName} · ${inv.therapistName}` : undefined}
        actions={inv && <><Button variant="outline" icon={<Download className="size-3.5" />} loading={pdfBusy} onClick={pdf}>Download PDF</Button>{staff && <Button icon={<Mail className="size-3.5" />} onClick={() => setMailOpen(true)}>Email to client</Button>}</>} /></div>
      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        {!inv ? <Skeleton className="h-[480px] rounded-[14px]" /> : <InvoiceDocument invoice={inv} />}
        <div className="no-print space-y-4">
          <SectionCard title="Status">
            {!inv ? <Skeleton className="h-24" /> : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2"><StatusBadge status={inv.status} /><StatusBadge status={inv.paymentStatus} label={`Payment: ${inv.paymentStatus}`} /></div>
                <div className="grid grid-cols-2 gap-3"><KV label="Emailed">{inv.emailedAt ? fmtDateTime(inv.emailedAt) : "Not sent"}</KV><KV label="Payment ref">{inv.paymentId ?? "—"}</KV></div>
                {staff && inv.status !== "void" && (
                  <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                    {inv.paymentStatus !== "paid" && <Button size="sm" icon={<CheckCircle2 className="size-3.5" />} onClick={() => setStatus("paid", "Mark as paid")}>Mark paid</Button>}
                    {inv.status === "draft" && <Button size="sm" variant="outline" onClick={() => setStatus("sent", "Mark as sent")}>Mark sent</Button>}
                    {role === "admin" && <Button size="sm" variant="danger" icon={<Ban className="size-3.5" />} onClick={() => setStatus("void", "Void invoice", true)}>Void</Button>}
                  </div>
                )}
              </div>
            )}
          </SectionCard>
          {staff && inv?.paymentId && inv.paymentStatus === "paid" && (
            <SectionCard title="Document type" action={<span className="text-[10px] text-muted">After successful payment</span>}>
              <p className="mb-3 text-[11px] text-muted">Choose which document the client receives for this payment.</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={inv.kind === "receipt" ? "primary" : "outline"} icon={<Receipt className="size-3.5" />} loading={doc.isPending} disabled={inv.kind === "receipt"} onClick={() => convert("receipt")}>Payment receipt</Button>
                <Button size="sm" variant={inv.kind === "tax_invoice" ? "primary" : "outline"} icon={<FileText className="size-3.5" />} loading={doc.isPending} disabled={inv.kind === "tax_invoice"} onClick={() => convert("tax_invoice")}>Tax invoice</Button>
              </div>
            </SectionCard>
          )}
        </div>
      </div>
      <FormDialog<{ to: string; message?: string }> open={mailOpen} onClose={() => setMailOpen(false)} title="Email document" description={inv?.no} submitLabel="Send email"
        fields={[{ name: "to", label: "Recipient", type: "email", span: 2 }, { name: "message", label: "Message (optional)", type: "textarea" }]} schema={emailSchema} defaultValues={{ to: inv?.clientEmail ?? "", message: "" } as never}
        successMessage="Email queued for delivery" onSubmit={async (v) => { await providers.notification.send({ channel: "email", to: v.to, template: inv?.kind ?? "invoice" }); await email.mutateAsync({ id: inv!.id }); }} />
    </>
  );
}