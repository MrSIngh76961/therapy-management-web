"use client";
import { InvoiceDetail } from "@/features/shared/invoice-detail";

export default function Page() {
  return <InvoiceDetail role="client" backHref="/client/payments" />;
}
