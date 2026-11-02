"use client";
import { motion } from "framer-motion";
import { CheckCircle2, FileText, HeartPulse, ShieldCheck } from "lucide-react";
import { useApiQuery } from "@/hooks/useResource";
import { fmtDate, money } from "@/lib/format";
import type { ClinicSettings, Invoice } from "@/services/types";

export function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  const clinic = useApiQuery<ClinicSettings>(["settings", "clinic"], "/settings/clinic");
  const isTax = invoice.kind === "tax_invoice";
  const half = invoice.tax / 2;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      id="invoice-document"
      aria-label={`${isTax ? "Tax invoice" : "Payment receipt"} ${invoice.no}`}
      className="relative overflow-hidden rounded-2xl border border-line bg-white p-6 shadow-card print:border-0 print:p-0 print:shadow-none sm:p-8"
    >
      {/* Paid / Void watermark stamp */}
      {invoice.paymentStatus === "paid" && (
        <div className="pointer-events-none absolute right-8 top-28 -rotate-12 rounded-xl border-4 border-ok/40 bg-mint/40 px-5 py-1.5 text-2xl font-black tracking-widest text-ok/70 shadow-xs">
          PAID
        </div>
      )}
      {invoice.status === "void" && (
        <div className="pointer-events-none absolute right-8 top-28 -rotate-12 rounded-xl border-4 border-bad/40 bg-coral/40 px-5 py-1.5 text-2xl font-black tracking-widest text-bad/70 shadow-xs">
          VOID
        </div>
      )}

      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div className="flex items-center gap-3.5">
          <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-wine to-[#d15d7d] font-extrabold text-white shadow-sm">
            <HeartPulse className="size-6" />
          </div>
          <div>
            <div className="text-base font-extrabold text-ink">{clinic.data?.name ?? "TheraFlow Wellness Clinic"}</div>
            <div className="max-w-[280px] text-[11px] text-muted">{clinic.data?.address}</div>
            {isTax && <div className="mt-0.5 text-[11px] font-semibold text-wine">GSTIN: {clinic.data?.gstin}</div>}
          </div>
        </div>
        <div className="text-right">
          <div className="inline-block rounded-lg bg-rose/80 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-wine">
            {isTax ? "Official Tax Invoice" : "Payment Receipt"}
          </div>
          <div className="mt-1 text-base font-black text-ink">{invoice.no}</div>
          <div className="text-[11px] text-muted">
            Issued {fmtDate(invoice.issueDate)}
            {isTax && <> · Due {fmtDate(invoice.dueDate)}</>}
          </div>
        </div>
      </header>

      {/* Parties */}
      <section className="grid gap-6 py-6 sm:grid-cols-2 border-b border-line/60">
        <div className="rounded-xl bg-warm-ivory/80 p-4 border border-line/60">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Billed To (Client)</div>
          <div className="mt-1 text-sm font-extrabold text-ink">{invoice.clientName}</div>
          <div className="text-xs text-muted">{invoice.clientEmail}</div>
        </div>
        <div className="rounded-xl bg-warm-ivory/80 p-4 border border-line/60">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Healthcare Provider</div>
          <div className="mt-1 text-sm font-extrabold text-ink">{invoice.therapistName}</div>
          {invoice.paymentId && <div className="text-xs text-muted">Payment Ref: {invoice.paymentId}</div>}
        </div>
      </section>

      {/* Items Table */}
      <div className="scroll-thin overflow-x-auto py-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-line text-left text-[11px] font-extrabold uppercase tracking-wider text-muted bg-warm-ivory/55">
              <th className="py-3 px-3">Description</th>
              <th className="py-3 px-3 text-right">Qty</th>
              <th className="py-3 px-3 text-right">Rate</th>
              <th className="py-3 px-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it, i) => (
              <tr key={i} className="border-b border-line/60 hover:bg-warm-ivory/30 transition-colors">
                <td className="py-3.5 px-3 font-semibold text-ink">{it.description}</td>
                <td className="py-3.5 px-3 text-right text-muted">{it.qty}</td>
                <td className="py-3.5 px-3 text-right text-muted">{money(it.rate)}</td>
                <td className="py-3.5 px-3 text-right font-bold text-ink">{money(it.qty * it.rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Calculation Summary */}
      <div className="ml-auto mt-4 w-full max-w-[300px] space-y-2 rounded-xl bg-gradient-to-br from-warm-ivory to-white p-4 border border-line text-xs">
        <div className="flex justify-between text-muted">
          <span>Subtotal</span>
          <span className="font-semibold text-ink">{money(invoice.subtotal)}</span>
        </div>
        {isTax ? (
          <>
            <div className="flex justify-between text-muted">
              <span>CGST ({invoice.gst / 2}%)</span>
              <span className="font-semibold text-ink">{money(half)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>SGST ({invoice.gst / 2}%)</span>
              <span className="font-semibold text-ink">{money(half)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between text-muted">
            <span>GST Included ({invoice.gst}%)</span>
            <span className="font-semibold text-ink">{money(invoice.tax)}</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-line pt-2 text-sm">
          <span className="font-bold text-ink">Total Amount</span>
          <span className="text-xl font-black text-wine">{money(invoice.total)}</span>
        </div>
      </div>

      {invoice.notes && (
        <div className="mt-6 rounded-xl border border-line bg-warm-ivory p-3.5 text-xs text-muted">
          <b className="text-ink">Notes & Payment Instructions: </b>
          {invoice.notes}
        </div>
      )}

      {/* Footer */}
      <footer className="mt-8 border-t border-line pt-4 text-center text-[11px] text-muted">
        <p className="flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="size-3.5 text-ok" />
          This is an official computer-generated document under the DPDP & GST Acts.
        </p>
        <p className="mt-0.5">
          {clinic.data?.email} · {clinic.data?.phone}
        </p>
      </footer>
    </motion.article>
  );
}
