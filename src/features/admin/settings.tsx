"use client";
import { Hash, Plug } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, SectionCard } from "@/components/ui/card";
import { EntityForm, type FieldDef } from "@/components/ui/entity-form";
import { CardSkeleton, ErrorState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useAction, useApiQuery } from "@/hooks/useResource";
import { api } from "@/services/api";
import type { ClinicSettings, InvoiceSeries } from "@/services/types";
import { SeriesModal } from "./invoices";

const profileSchema = z.object({
  name: z.string().min(2, "Clinic name is required"), email: z.string().email("Enter a valid email"), phone: z.string().min(8, "Enter a phone number"),
  website: z.string(), address: z.string().min(5, "Enter the address"),
});
const taxSchema = z.object({
  gstin: z.string().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Enter a valid 15-character GSTIN"), currency: z.string().min(1), timezone: z.string().min(1),
});
const policySchema = z.object({
  cancellationHours: z.number({ error: "Enter hours" }).min(0).max(168), defaultReminderHours: z.number({ error: "Enter hours" }).min(0).max(168),
});
const profileFields: FieldDef[] = [
  { name: "name", label: "Clinic name", span: 2 }, { name: "email", label: "Email", type: "email" }, { name: "phone", label: "Phone", type: "tel" },
  { name: "website", label: "Website" }, { name: "address", label: "Address", type: "textarea" },
];
const taxFields: FieldDef[] = [
  { name: "gstin", label: "GSTIN", hint: "Printed on tax invoices", span: 2 },
  { name: "currency", label: "Currency", type: "select", options: [{ value: "INR", label: "INR (₹)" }] },
  { name: "timezone", label: "Timezone", type: "select", options: [{ value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" }] },
];
const policyFields: FieldDef[] = [
  { name: "cancellationHours", label: "Free cancellation window (hours before)", type: "number", min: 0 },
  { name: "defaultReminderHours", label: "Default reminder lead time (hours)", type: "number", min: 0 },
];
const providerOptions: Record<keyof ClinicSettings["integrations"], { label: string; options: string[] }> = {
  video: { label: "Video", options: ["mock", "daily", "twilio", "zoom"] },
  transcription: { label: "Transcription", options: ["mock", "deepgram", "assemblyai", "whisper"] },
  payment: { label: "Payments", options: ["mock", "razorpay", "stripe"] },
  calendar: { label: "Calendar", options: ["mock", "google", "outlook"] },
  storage: { label: "Storage", options: ["mock", "s3", "gcs", "azure"] },
  notification: { label: "Notifications", options: ["mock", "sendgrid", "twilio", "firebase"] },
};

export function SettingsPage() {
  const [tab, setTab] = useState("profile");
  const [series, setSeries] = useState(false);
  const { toast } = useToast();
  const q = useApiQuery<ClinicSettings>(["settings", "clinic"], "/settings/clinic");
  const sq = useApiQuery<InvoiceSeries>(["settings", "series"], "/settings/invoice-series");
  const save = useAction((patch: Partial<ClinicSettings>) => api.put("/settings/clinic", patch), ["settings"]);
  const s = q.data;
  const submit = (msg: string) => async (v: Partial<ClinicSettings>) => { try { await save.mutateAsync(v); toast(msg); } catch (e) { toast(e instanceof Error ? e.message : "Could not save settings", "error"); } };

  return (
    <>
      <PageHeader eyebrow="Administration" title="Clinic Settings & Profile" subtitle="Clinic identity, tax, numbering, policies and integrations." />
      <Tabs className="mb-4 w-fit" value={tab} onChange={setTab} items={[{ id: "profile", label: "Clinic profile" }, { id: "tax", label: "Tax & billing" }, { id: "policy", label: "Policies" }, { id: "integrations", label: "Integrations" }]} />
      {q.isError ? <ErrorState onRetry={() => q.refetch()} /> : !s ? <CardSkeleton rows={5} /> : (
        <div className="max-w-3xl">
          {tab === "profile" && <SectionCard title="Clinic profile"><EntityForm fields={profileFields} schema={profileSchema} defaultValues={s} onSubmit={submit("Clinic profile saved")} submitLabel="Save profile" /></SectionCard>}
          {tab === "tax" && (
            <div className="space-y-4">
              <SectionCard title="Tax & regional"><EntityForm fields={taxFields} schema={taxSchema} defaultValues={s} onSubmit={submit("Tax settings saved")} submitLabel="Save" /></SectionCard>
              <SectionCard title="Invoice numbering" action={<Button size="sm" variant="outline" icon={<Hash className="size-3.5" />} onClick={() => setSeries(true)}>Configure</Button>}>
                {sq.data ? <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                  {[["Invoice prefix", sq.data.invoicePrefix], ["Receipt prefix", sq.data.receiptPrefix], ["Starting counter", sq.data.startCounter], ["Next number", sq.data.nextCounter]].map(([k, v]) => <Card key={k as string} hover={false} className="p-3"><div className="text-[10px] font-bold uppercase text-[#999]">{k}</div><div className="mt-1 font-extrabold">{v}</div></Card>)}
                </div> : <CardSkeleton rows={1} />}
              </SectionCard>
            </div>
          )}
          {tab === "policy" && <SectionCard title="Booking policies"><EntityForm fields={policyFields} schema={policySchema} defaultValues={s} onSubmit={submit("Policies saved")} submitLabel="Save policies" /></SectionCard>}
          {tab === "integrations" && (
            <SectionCard title="Provider integrations" action={<Plug className="size-4 text-wine" />}>
              <p className="mb-4 text-xs text-muted">Each capability is behind a provider interface. Switching a provider here selects which adapter the backend uses; the UI does not change.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(providerOptions) as (keyof ClinicSettings["integrations"])[]).map((k) => (
                  <label key={k} className="block text-[11px] font-bold">{providerOptions[k].label}
                    <select value={s.integrations[k]} onChange={async (e) => { await submit(`${providerOptions[k].label} provider set to ${e.target.value}`)({ integrations: { ...s.integrations, [k]: e.target.value } }); }} className="mt-1 w-full rounded-[10px] border border-line bg-white px-3 py-2.5 text-xs font-normal">
                      {providerOptions[k].options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}
      <SeriesModal open={series} onClose={() => setSeries(false)} series={sq.data} />
    </>
  );
}