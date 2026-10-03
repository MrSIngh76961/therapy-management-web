"use client";
import { PaymentsView } from "@/features/shared/payments";

export default function Page() {
  return <PaymentsView role="therapist" backInvoice="/therapist/invoices" />;
}
