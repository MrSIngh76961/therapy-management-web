"use client";
import { Hash, Plug, ShieldCheck, Sparkles } from "lucide-react";
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
  name: z.string().min(2, "Clinic name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(8, "Enter a phone number"),
  website: z.string(),
  address: z.string().min(5, "Enter the clinic address"),
});

const taxSchema = z.object({
  gstin: z.string().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Enter a valid 15-character GSTIN"),
  currency: z.string().min(1),
  timezone: z.string().min(1),
});

const policySchema = z.object({
  cancellationHours: z.number({ error: "Enter hours" }).min(0).max(168),
  defaultReminderHours: z.number({ error: "Enter hours" }).min(0).max(168),
});

const profileFields: FieldDef[] = [
  { name: "name", label: "Clinic legal practice name", span: 2 },
  { name: "email", label: "Official practice email", type: "email" },
  { name: "phone", label: "Practice phone number", type: "tel" },
  { name: "website", label: "Public website URL" },
  { name: "address", label: "Registered physical address", type: "textarea" },
];

const taxFields: FieldDef[] = [
  { name: "gstin", label: "Goods and Services Tax ID (GSTIN)", hint: "Printed on official tax invoices and receipts", span: 2 },
  { name: "currency", label: "Operational currency", type: "select", options: [{ value: "INR", label: "INR (₹) — Indian Rupee" }] },
  { name: "timezone", label: "Practice timezone", type: "select", options: [{ value: "Asia/Kolkata", label: "Asia/Kolkata (IST — UTC+5:30)" }] },
];

const policyFields: FieldDef[] = [
  { name: "cancellationHours", label: "Free client cancellation window (hours before session)", type: "number", min: 0 },
  { name: "defaultReminderHours", label: "Automated session reminder lead time (hours)", type: "number", min: 0 },
];

const providerOptions: Record<keyof ClinicSettings["integrations"], { label: string; desc: string; options: string[] }> = {
  video: { label: "Virtual Session Video", desc: "WebRTC peer engine", options: ["mock", "daily", "twilio", "zoom"] },
  transcription: { label: "Speech-to-Text Transcription", desc: "AI real-time transcript generator", options: ["mock", "deepgram", "assemblyai", "whisper"] },
  payment: { label: "Payment Gateway", desc: "UPI, Cards & Netbanking", options: ["mock", "razorpay", "stripe"] },
  calendar: { label: "Calendar Synchronization", desc: "Calendar events engine", options: ["mock", "google", "outlook"] },
  storage: { label: "Encrypted Cloud Storage", desc: "Document & worksheet attachments", options: ["mock", "s3", "gcs", "azure"] },
  notification: { label: "Notification Channels", desc: "Email, WhatsApp & SMS alerts", options: ["mock", "sendgrid", "twilio", "firebase"] },
};

export function SettingsPage() {
  const [tab, setTab] = useState("profile");
  const [series, setSeries] = useState(false);
  const { toast } = useToast();
  const q = useApiQuery<ClinicSettings>(["settings", "clinic"], "/settings/clinic");
  const sq = useApiQuery<InvoiceSeries>(["settings", "series"], "/settings/invoice-series");
  const save = useAction(
    (patch: Partial<ClinicSettings>) => api.put("/settings/clinic", patch),
    ["settings"],
  );
  const s = q.data;

  const submit = (msg: string) => async (v: Partial<ClinicSettings>) => {
    try {
      await save.mutateAsync(v);
      toast(msg);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not save settings", "error");
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Clinic Configuration"
        title="Settings & Practice Profile"
        subtitle="Manage clinic identity, tax identification, automated policies and connected provider integrations."
      />
      <Tabs
        className="mb-5 w-fit"
        value={tab}
        onChange={setTab}
        items={[
          { id: "profile", label: "Practice Profile" },
          { id: "tax", label: "Tax & Regional" },
          { id: "policy", label: "Booking Policies" },
          { id: "integrations", label: "Integrations & Adapters" },
        ]}
      />
      {q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : !s ? (
        <CardSkeleton rows={5} />
      ) : (
        <div className="max-w-3xl space-y-5">
          {tab === "profile" && (
            <SectionCard variant="ivory" title="Clinic Legal Profile">
              <EntityForm
                fields={profileFields}
                schema={profileSchema}
                defaultValues={s}
                onSubmit={submit("Clinic profile updated")}
                submitLabel="Save profile"
              />
            </SectionCard>
          )}

          {tab === "tax" && (
            <div className="space-y-5">
              <SectionCard variant="ivory" title="Tax & Financial Details">
                <EntityForm
                  fields={taxFields}
                  schema={taxSchema}
                  defaultValues={s}
                  onSubmit={submit("Tax settings updated")}
                  submitLabel="Save tax settings"
                />
              </SectionCard>
              <SectionCard
                variant="ivory"
                title="Invoice & Receipt Numbering"
                subtitle="Configures sequence counters for generated documents"
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Hash className="size-3.5" />}
                    onClick={() => setSeries(true)}
                  >
                    Configure series
                  </Button>
                }
              >
                {sq.data ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      ["Invoice prefix", sq.data.invoicePrefix],
                      ["Receipt prefix", sq.data.receiptPrefix],
                      ["Starting sequence", sq.data.startCounter],
                      ["Next document", sq.data.nextCounter],
                    ].map(([k, v]) => (
                      <Card key={k as string} hover={false} className="p-3 text-xs border border-[#EDE4E8] bg-white">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#888188]">{k}</div>
                        <div className="mt-1 font-black text-[#1F191D]">{v}</div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <CardSkeleton rows={1} />
                )}
              </SectionCard>
            </div>
          )}

          {tab === "policy" && (
            <SectionCard variant="ivory" title="Clinical Booking Policies">
              <EntityForm
                fields={policyFields}
                schema={policySchema}
                defaultValues={s}
                onSubmit={submit("Policies saved successfully")}
                submitLabel="Save booking policies"
              />
            </SectionCard>
          )}

          {tab === "integrations" && (
            <SectionCard
              variant="ivory"
              title="Provider Integrations"
              subtitle="Pluggable microservice adapters"
              icon={<Plug className="size-4" />}
            >
              <p className="mb-4 text-xs text-[#6E686F]">
                TheraFlow isolates core business logic behind clean provider interfaces. Selecting an adapter dynamically routes requests through that integration without frontend modifications.
              </p>
              <div className="grid gap-3.5 sm:grid-cols-2">
                {(Object.keys(providerOptions) as (keyof ClinicSettings["integrations"])[]).map((k) => (
                  <div key={k} className="rounded-xl border border-[#EDE4E8] bg-white p-4 shadow-xs">
                    <label className="block text-xs font-black text-[#1F191D]">
                      {providerOptions[k].label}
                      <span className="block text-[10px] font-medium text-[#888188]">
                        {providerOptions[k].desc}
                      </span>
                      <select
                        value={s.integrations[k]}
                        onChange={async (e) => {
                          await submit(`${providerOptions[k].label} adapter set to ${e.target.value}`)({
                            integrations: { ...s.integrations, [k]: e.target.value },
                          });
                        }}
                        className="mt-2 w-full rounded-[10px] border border-[#EDE4E8] bg-[#FAF7F8] px-3 py-2 text-xs font-bold text-[#4A4449] outline-none transition-all focus:border-[#98143F] focus:bg-white"
                      >
                        {providerOptions[k].options.map((o) => (
                          <option key={o} value={o}>
                            {o.toUpperCase()} Adapter
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
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
