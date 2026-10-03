"use client";
import { motion } from "framer-motion";
import { useApiQuery } from "@/hooks/useResource";
import { fmtDate, money } from "@/lib/format";
import type { ClinicSettings, Invoice } from "@/services/types";

export function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  const clinic = useApiQuery<ClinicSettings>(["settings", "clinic"], "/settings/clinic");
  const isTax = invoice.kind === "tax_invoice";
  const half = invoice.tax / 2;
  return (
    <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} id="invoice-document" aria-label={`${isTax ? "Tax invoice" : "Payment receipt"} ${invoice.no}`} className="relative overflow-hidden rounded-[14px] border border-[#eee] bg-white p-6 shadow-card print:border-0 print:p-0 print:shadow-none sm:p-8">
      {invoice.paymentStatus === "paid" && <div className="pointer-events-none absolute right-8 top-24 -rotate-12 rounded-lg border-4 border-ok/50 px-4 py-1 text-2xl font-extrabold tracking-widest text-ok/50">PAID</div>}
      {invoice.status === "void" && <div className="pointer-events-none absolute right-8 top-24 -rotate-12 rounded-lg border-4 border-bad/40 px-4 py-1 text-2xl font-extrabold tracking-widest text-bad/40">VOID</div>}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-wine to-[#d15d7d] font-extrabold text-white">T</div>
          <div><div className="text-sm font-extrabold">{clinic.data?.name ?? "TheraFlow Wellness Clinic"}</div><div className="max-w-[260px] text-[10px] text-muted">{clinic.data?.address}</div>{isTax && <div className="text-[10px] text-muted">GSTIN: {clinic.data?.gstin}</div>}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-extrabold uppercase tracking-wide text-wine">{isTax ? "Tax Invoice" : "Payment Receipt"}</div>
          <div className="text-xs font-bold">{invoice.no}</div>
          <div className="text-[10px] text-muted">Issued {fmtDate(invoice.issueDate)}{isTax && <> · Due {fmtDate(invoice.dueDate)}</>}</div>
        </div>
      </header>
      <section className="grid gap-4 py-5 sm:grid-cols-2">
        <div><div className="text-[10px] font-bold uppercase text-muted">Billed to</div><div className="text-xs font-bold">{invoice.clientName}</div><div className="text-[11px] text-muted">{invoice.clientEmail}</div></div>
        <div><div className="text-[10px] font-bold uppercase text-muted">Provider</div><div className="text-xs font-bold">{invoice.therapistName}</div>{invoice.paymentId && <div className="text-[11px] text-muted">Payment ref: {invoice.paymentId}</div>}</div>
      </section>
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-y border-line text-left text-[10px] uppercase text-muted"><th className="py-2">Description</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Rate</th><th className="py-2 text-right">Amount</th></tr></thead>
          <tbody>{invoice.items.map((it, i) => <tr key={i} className="border-b border-[#f0ecec]"><td className="py-2.5">{it.description}</td><td className="py-2.5 text-right">{it.qty}</td><td className="py-2.5 text-right">{money(it.rate)}</td><td className="py-2.5 text-right">{money(it.qty * it.rate)}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="ml-auto mt-4 w-full max-w-[280px] space-y-1.5 text-xs">
        <div className="flex justify-between"><span className="text-muted">Subtotal</span>{money(invoice.subtotal)}</div>
        {isTax ? <>
          <div className="flex justify-between"><span className="text-muted">CGST ({invoice.gst / 2}%)</span>{money(half)}</div>
          <div className="flex justify-between"><span className="text-muted">SGST ({invoice.gst / 2}%)</span>{money(half)}</div>
        </> : <div className="flex justify-between"><span className="text-muted">GST included ({invoice.gst}%)</span>{money(invoice.tax)}</div>}
        <div className="flex items-center justify-between border-t border-line pt-2"><b>Total</b><span className="text-[22px] font-extrabold text-wine">{money(invoice.total)}</span></div>
      </div>
      {invoice.notes && <p className="mt-5 rounded-lg bg-[#faf7f8] p-3 text-[11px] text-muted">{invoice.notes}</p>}
      <footer className="mt-6 border-t border-line pt-3 text-center text-[10px] text-muted">This is a computer-generated document. {clinic.data?.email} · {clinic.data?.phone}</footer>
    </motion.article>
  );
}