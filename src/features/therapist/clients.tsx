"use client";
import { CalendarPlus, Check, ChevronRight, Plus, Send, ShieldQuestion, Sparkles, UserPlus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Avatar, Card, KV, SectionCard, StatusBadge } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useAction, useItem, useList } from "@/hooks/useResource";
import { cn } from "@/lib/cn";
import { fmtDate } from "@/lib/format";
import { api } from "@/services/api";
import type { Appointment, Client } from "@/services/types";
import { AppointmentsView } from "@/features/shared/appointments";
import { ConsentView } from "@/features/shared/consent";
import { DocumentsView } from "@/features/shared/documents";
import { FormDialog } from "@/features/shared/form-dialog";
import { JourneyBadges } from "@/features/shared/labels";
import { SessionsView } from "@/features/shared/sessions";
import { TasksView } from "@/features/shared/tasks";

const inviteSchema = z.object({
  name: z.string().min(2, "Enter the client's name"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().regex(/^[+\d][\d\s-]{7,14}$/, "Enter a valid phone number"),
  age: z.number({ error: "Enter age" }).min(10, "Min age 10").max(110),
  gender: z.string().min(1, "Select one"),
  sendConsent: z.boolean(),
});
const gender = ["Female", "Male", "Non-binary", "Prefer not to say"].map((v) => ({ value: v, label: v }));

export function ClientsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const invite = useAction(
    (v: Record<string, unknown>) => api.post<Client>("/clients/invite", { ...v, therapistId: user?.id }),
    ["clients", "consents"],
  );

  return (
    <>
      <PageHeader
        eyebrow="Caseload"
        title="My Clients"
        subtitle="Invite clients to care. Clients can give consent and join virtual sessions immediately via secure link without waiting to create an account."
        actions={
          <Button icon={<UserPlus className="size-3.5" />} onClick={() => setOpen(true)}>
            Invite client
          </Button>
        }
      />
      <DataTable
        resource="clients"
        baseParams={{ therapistId: user?.id }}
        searchPlaceholder="Search clients by name, email or phone…"
        defaultSort={{ key: "name", dir: "asc" }}
        onRowClick={(c) => router.push(`/therapist/clients/${c.id}`)}
        filters={[
          {
            key: "onboarding",
            label: "Consent",
            options: [
              { value: "invited", label: "Invited" },
              { value: "consent_pending", label: "Consent pending" },
              { value: "consent_provided", label: "Consent provided" },
            ],
          },
          {
            key: "registration",
            label: "Portal account",
            options: [
              { value: "not_registered", label: "Not registered" },
              { value: "registered", label: "Registered" },
            ],
          },
          {
            key: "status",
            label: "Status",
            options: ["active", "inactive", "archived"].map((v) => ({
              value: v,
              label: v[0].toUpperCase() + v.slice(1),
            })),
          },
        ]}
        emptyTitle="No clients in your caseload"
        emptyDescription="Invite your first client to start scheduling sessions and tracking homework."
        emptyAction={<Button onClick={() => setOpen(true)}>Invite client</Button>}
        columns={[
          {
            key: "name",
            header: "Client",
            sortable: true,
            render: (c: Client) => (
              <div className="flex items-center gap-3">
                <Avatar name={c.name} size={36} />
                <div>
                  <div className="font-extrabold text-[#1F191D]">{c.name}</div>
                  <div className="text-[11px] text-[#6E686F]">{c.email}</div>
                </div>
              </div>
            ),
          },
          {
            key: "journey",
            header: "Journey & Consent",
            render: (c: Client) => <JourneyBadges client={c} />,
          },
          {
            key: "lastSession",
            header: "Last Session",
            sortable: true,
            hideBelow: "md",
            render: (c: Client) => (c.lastSession ? fmtDate(c.lastSession) : <span className="text-[#888188]">—</span>),
          },
          {
            key: "status",
            header: "Status",
            sortable: true,
            hideBelow: "sm",
            render: (c: Client) => <StatusBadge status={c.status} />,
          },
        ]}
      />
      <FormDialog<{ name: string }>
        open={open}
        onClose={() => setOpen(false)}
        title="Invite Client to Care"
        description="Add client details. A secure, one-click DPDPA consent link will be generated automatically."
        submitLabel="Send invitation"
        schema={inviteSchema}
        successMessage="Client invited successfully"
        fields={[
          { name: "name", label: "Full client name", span: 2 },
          { name: "email", label: "Email address", type: "email" },
          { name: "phone", label: "Phone number", type: "tel" },
          { name: "age", label: "Age", type: "number", min: 10 },
          { name: "gender", label: "Gender", type: "select", options: gender },
          { name: "sendConsent", label: "Send DPDPA consent request immediately", type: "checkbox" },
        ]}
        defaultValues={{ name: "", email: "", phone: "", age: undefined, gender: "", sendConsent: true } as never}
        onSubmit={(v) => invite.mutateAsync(v)}
      />
    </>
  );
}

const steps = [
  "Invited to Care",
  "Consent Requested",
  "DPDPA Consent Recorded",
  "Portal Account Created",
  "Session Link Dispatched",
  "Session Joined",
  "Session Completed",
];

function journeyIndex(c: Client, appts: Appointment[]) {
  const has = (s: string[]) => appts.some((a) => s.includes(a.status));
  const done = [
    true,
    c.onboarding !== "invited",
    c.onboarding === "consent_provided",
    c.registration === "registered",
    has(["link_shared", "joined", "live", "completed"]),
    has(["joined", "live", "completed"]),
    has(["completed"]),
  ];
  return done;
}

export function ClientDashboard() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");
  const q = useItem("clients", id);
  const appts = useList("appointments", { clientId: id });
  const request = useAction(() => api.post("/consents/request", { clientId: id }), ["consents", "clients"]);
  const c = q.data;

  if (q.isError)
    return (
      <>
        <PageHeader back={{ href: "/therapist/clients", label: "My Clients" }} title="Client Record" />
        <ErrorState message="Client record could not be loaded or was removed." onRetry={() => q.refetch()} />
      </>
    );

  if (!c)
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/3 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
      </div>
    );

  const done = journeyIndex(c, appts.data ?? []);
  const last = done.lastIndexOf(true);
  const upcoming = (appts.data ?? [])
    .filter((a) => ["scheduled", "link_shared", "joined", "live"].includes(a.status))
    .sort((a, b) => a.start.localeCompare(b.start))[0];

  return (
    <>
      <PageHeader
        back={{ href: "/therapist/clients", label: "My Clients" }}
        eyebrow="Client Health Journey"
        title={c.name}
        subtitle={`${c.email} · ${c.phone || "No phone"} · Onboarded ${fmtDate(c.joined)}`}
        actions={
          <>
            {c.onboarding !== "consent_provided" && (
              <Button
                variant="outline"
                icon={<ShieldQuestion className="size-3.5" />}
                loading={request.isPending}
                onClick={async () => {
                  try {
                    await request.mutateAsync();
                    toast("Consent request sent via secure link");
                  } catch {
                    toast("Could not send consent request", "error");
                  }
                }}
              >
                {c.onboarding === "invited" ? "Request DPDPA consent" : "Resend consent link"}
              </Button>
            )}
            <Button icon={<CalendarPlus className="size-3.5" />} onClick={() => setTab("appointments")}>
              Schedule session
            </Button>
          </>
        }
      />
      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        items={["overview", "sessions", "appointments", "consent", "tasks", "documents"].map((t) => ({
          id: t,
          label: t === "overview" ? "Care Overview" : t[0].toUpperCase() + t.slice(1),
        }))}
      />
      {tab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <SectionCard
            variant="ivory"
            title="Therapy Onboarding & Care Journey"
            subtitle="DPDPA compliance and engagement milestones"
            action={<JourneyBadges client={c} />}
          >
            <ol className="space-y-0 pt-2">
              {steps.map((s, i) => (
                <li key={s} className="flex gap-3.5">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "grid size-6.5 place-items-center rounded-full border-2 text-[10px] font-black transition-all",
                        done[i]
                          ? "border-[#98143F] bg-gradient-to-br from-[#98143F] to-[#71102F] text-white shadow-xs"
                          : i === last + 1
                          ? "border-[#98143F] bg-white text-[#98143F] ring-4 ring-[#98143F]/15"
                          : "border-[#EDE4E8] bg-white text-[#B3ADB0]",
                      )}
                    >
                      {done[i] ? <Check className="size-3.5 stroke-[3]" /> : i + 1}
                    </span>
                    {i < steps.length - 1 && (
                      <span
                        className={cn(
                          "h-7 w-0.5 transition-colors",
                          done[i + 1] ? "bg-[#98143F]" : "bg-[#EDE4E8]",
                        )}
                      />
                    )}
                  </div>
                  <div className={cn("pb-5 pt-0.5 text-xs font-bold", done[i] ? "text-[#1F191D]" : "text-[#888188]")}>
                    <span>{s}</span>
                    {i === last + 1 && (
                      <span className="ml-2.5 rounded-full bg-[#F4DCE6] px-2 py-0.5 text-[9px] font-black uppercase text-[#98143F]">
                        Next Milestone
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-2 rounded-xl border border-[#EDE4E8] bg-white p-3.5 text-xs text-[#6E686F] shadow-xs">
              💡 <b>Frictionless Care:</b> You can run sessions at any stage. Clients give consent and join via secure token links. When they create an account later, historical sessions, transcripts, and tasks merge automatically.
            </div>
          </SectionCard>

          <div className="space-y-5">
            <SectionCard variant="ivory" title="Patient Demographics">
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-[#EDE4E8] bg-white p-4">
                <KV label="Age">{c.age ? `${c.age} years` : "—"}</KV>
                <KV label="Gender">{c.gender}</KV>
                <KV label="Account Status">
                  <StatusBadge status={c.status} />
                </KV>
                <KV label="Last Session Completed">{c.lastSession ? fmtDate(c.lastSession) : "—"}</KV>
              </div>
            </SectionCard>

            <SectionCard variant="ivory" title="Next Clinical Session">
              {upcoming ? (
                <div className="rounded-xl border border-[#EBC3D3] bg-gradient-to-br from-[#FDECF1] to-[#F4DCE6] p-4 text-xs">
                  <div className="font-black text-sm text-[#1F191D]">{fmtDate(upcoming.start)}</div>
                  <div className="mb-2 text-[#6E686F]">{upcoming.serviceName}</div>
                  <StatusBadge status={upcoming.status} />
                  <div className="mt-4">
                    <Link href={`/therapist/session/${upcoming.id}`}>
                      <Button size="sm" icon={<Send className="size-3" />}>
                        Launch session room
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#EDE4E8] p-6 text-center text-xs text-[#888188]">
                  <p>No upcoming sessions scheduled.</p>
                  <button
                    className="mt-2 inline-flex items-center gap-1 font-bold text-[#98143F] hover:underline"
                    onClick={() => setTab("appointments")}
                  >
                    Schedule appointment <Plus className="size-3" />
                  </button>
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      )}
      {tab === "sessions" && <SessionsView role="therapist" clientId={id} embedded />}
      {tab === "appointments" && <AppointmentsView role="therapist" clientId={id} />}
      {tab === "consent" && <ConsentView role="therapist" clientId={id} />}
      {tab === "tasks" && <TasksView role="therapist" clientId={id} />}
      {tab === "documents" && <DocumentsView role="therapist" clientId={id} />}
    </>
  );
}
