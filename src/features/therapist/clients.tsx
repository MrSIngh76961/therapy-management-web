"use client";
import { CalendarPlus, Check, Plus, Send, ShieldQuestion, UserPlus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Avatar, KV, SectionCard, StatusBadge } from "@/components/ui/card";
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

const inviteSchema = z.object({ name: z.string().min(2, "Enter the client's name"), email: z.string().email("Enter a valid email"), phone: z.string().regex(/^[+\d][\d\s-]{7,14}$/, "Enter a valid phone number"), age: z.number({ error: "Enter age" }).min(10, "Min age 10").max(110), gender: z.string().min(1, "Select one"), sendConsent: z.boolean() });
const gender = ["Female", "Male", "Non-binary", "Prefer not to say"].map((v) => ({ value: v, label: v }));

export function ClientsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const invite = useAction((v: Record<string, unknown>) => api.post<Client>("/clients/invite", { ...v, therapistId: user?.id }), ["clients", "consents"]);
  return (
    <>
      <PageHeader eyebrow="Practice" title="My Clients" subtitle="Invite clients and begin work immediately — no account needed to consent or join a session." actions={<Button icon={<UserPlus className="size-3.5" />} onClick={() => setOpen(true)}>Invite client</Button>} />
      <DataTable resource="clients" baseParams={{ therapistId: user?.id }} searchPlaceholder="Search clients…" defaultSort={{ key: "name", dir: "asc" }} onRowClick={(c) => router.push(`/therapist/clients/${c.id}`)}
        filters={[{ key: "onboarding", label: "Consent", options: [{ value: "invited", label: "Invited" }, { value: "consent_pending", label: "Consent pending" }, { value: "consent_provided", label: "Consent provided" }] }, { key: "registration", label: "Account", options: [{ value: "not_registered", label: "Not registered" }, { value: "registered", label: "Registered" }] }, { key: "status", label: "Status", options: ["active", "inactive", "archived"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })) }]}
        emptyTitle="No clients yet" emptyDescription="Invite your first client to get started." emptyAction={<Button onClick={() => setOpen(true)}>Invite client</Button>}
        columns={[
          { key: "name", header: "Client", sortable: true, render: (c: Client) => <div className="flex items-center gap-2.5"><Avatar name={c.name} size={32} /><div><div className="font-bold">{c.name}</div><div className="text-[10px] text-muted">{c.email}</div></div></div> },
          { key: "journey", header: "Journey", render: (c: Client) => <JourneyBadges client={c} /> },
          { key: "lastSession", header: "Last session", sortable: true, hideBelow: "md" as const, render: (c: Client) => (c.lastSession ? fmtDate(c.lastSession) : "—") },
          { key: "status", header: "Status", sortable: true, hideBelow: "sm" as const, render: (c: Client) => <StatusBadge status={c.status} /> },
        ]} />
      <FormDialog<{ name: string }> open={open} onClose={() => setOpen(false)} title="Invite client" description="Add a client now. Optionally send a secure DPDPA consent link right away." submitLabel="Invite" schema={inviteSchema} successMessage="Client added"
        fields={[{ name: "name", label: "Full name", span: 2 }, { name: "email", label: "Email", type: "email" }, { name: "phone", label: "Phone", type: "tel" }, { name: "age", label: "Age", type: "number", min: 10 }, { name: "gender", label: "Gender", type: "select", options: gender }, { name: "sendConsent", label: "Send DPDPA consent link now", type: "checkbox" }]}
        defaultValues={{ name: "", email: "", phone: "", age: undefined, gender: "", sendConsent: true } as never} onSubmit={(v) => invite.mutateAsync(v)} />
    </>
  );
}

const steps = ["Invited", "Consent requested", "Consent provided", "Registered", "Session link shared", "Session joined", "Session completed"];
function journeyIndex(c: Client, appts: Appointment[]) {
  const has = (s: string[]) => appts.some((a) => s.includes(a.status));
  const done = [true, c.onboarding !== "invited", c.onboarding === "consent_provided", c.registration === "registered", has(["link_shared", "joined", "live", "completed"]), has(["joined", "live", "completed"]), has(["completed"])];
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
  if (q.isError) return <><PageHeader back={{ href: "/therapist/clients", label: "My Clients" }} title="Client" /><ErrorState message="Client not found." onRetry={() => q.refetch()} /></>;
  if (!c) return <div className="space-y-4"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-44" /></div>;
  const done = journeyIndex(c, appts.data ?? []);
  const last = done.lastIndexOf(true);
  const upcoming = (appts.data ?? []).filter((a) => ["scheduled", "link_shared", "joined", "live"].includes(a.status)).sort((a, b) => a.start.localeCompare(b.start))[0];

  return (
    <>
      <PageHeader back={{ href: "/therapist/clients", label: "My Clients" }} eyebrow="Client dashboard" title={c.name} subtitle={`${c.email} · ${c.phone || "no phone"} · joined ${fmtDate(c.joined)}`}
        actions={<>{c.onboarding !== "consent_provided" && <Button variant="outline" icon={<ShieldQuestion className="size-3.5" />} loading={request.isPending} onClick={async () => { try { await request.mutateAsync(); toast("Consent request sent via secure link"); } catch { toast("Could not send request", "error"); } }}>{c.onboarding === "invited" ? "Request consent" : "Resend consent"}</Button>}<Button icon={<CalendarPlus className="size-3.5" />} onClick={() => setTab("appointments")}>Schedule session</Button></>} />
      <Tabs className="mb-4" value={tab} onChange={setTab} items={["overview", "sessions", "appointments", "consent", "tasks", "documents"].map((t) => ({ id: t, label: t[0].toUpperCase() + t.slice(1) }))} />
      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <SectionCard title="Client journey" action={<JourneyBadges client={c} />}>
            <ol className="space-y-0">{steps.map((s, i) => (
              <li key={s} className="flex gap-3"><div className="flex flex-col items-center"><span className={cn("grid size-6 place-items-center rounded-full border-2 text-[10px] font-bold transition-colors", done[i] ? "border-wine bg-wine text-white" : i === last + 1 ? "border-wine bg-white text-wine" : "border-line bg-white text-[#bbb]")}>{done[i] ? <Check className="size-3" /> : i + 1}</span>{i < steps.length - 1 && <span className={cn("h-6 w-0.5", done[i + 1] ? "bg-wine" : "bg-line")} />}</div><div className={cn("pb-5 pt-0.5 text-xs font-semibold", done[i] ? "text-ink" : "text-muted")}>{s}{i === last + 1 && <span className="ml-2 text-[10px] text-wine">Next</span>}</div></li>))}</ol>
            <p className="mt-1 rounded-lg bg-[#faf7f8] p-2.5 text-[11px] text-muted">You can run sessions at any stage — clients consent and join through a secure link. When they register later, all of these records move to their account automatically.</p>
          </SectionCard>
          <div className="space-y-4">
            <SectionCard title="Profile"><div className="grid grid-cols-2 gap-4"><KV label="Age">{c.age || "—"}</KV><KV label="Gender">{c.gender}</KV><KV label="Status"><StatusBadge status={c.status} /></KV><KV label="Last session">{c.lastSession ? fmtDate(c.lastSession) : "—"}</KV></div></SectionCard>
            <SectionCard title="Next session">{upcoming ? <div className="text-xs"><div className="font-extrabold">{fmtDate(upcoming.start)}</div><div className="mb-2 text-muted">{upcoming.serviceName}</div><StatusBadge status={upcoming.status} /><div className="mt-3"><Link href={`/therapist/session/${upcoming.id}`}><Button size="sm" icon={<Send className="size-3" />}>Open session</Button></Link></div></div> : <p className="text-xs text-muted">Nothing scheduled. <button className="font-bold text-wine hover:underline" onClick={() => setTab("appointments")}>Schedule one <Plus className="inline size-3" /></button></p>}</SectionCard>
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