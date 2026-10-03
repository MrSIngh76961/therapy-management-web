"use client";
import { CalendarCheck, CalendarDays, CalendarSync, Check, Copy, Link2, List, Pencil, Plus, Video, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, KV, StatusBadge } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { CardSkeleton, ErrorState } from "@/components/ui/feedback";
import { Drawer } from "@/components/ui/overlay";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { useConfirm } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";
import { useAction, useList, useUpdate } from "@/hooks/useResource";
import { fmtDateTime, fmtTime, fmtDate, money } from "@/lib/format";
import { providers } from "@/services/providers/registry";
import { api } from "@/services/api";
import type { Appointment, Role } from "@/services/types";
import type { FieldDef } from "@/components/ui/entity-form";
import { FormDialog } from "./form-dialog";
import { modeLabel, modeOptions, sessionStatusOptions } from "./labels";
import { WeekCalendar } from "./week-calendar";

const bookSchema = z.object({
  clientId: z.string().min(1, "Select a client"), therapistId: z.string().optional(), serviceId: z.string().min(1, "Select a service"),
  start: z.string().min(1, "Choose date and time").refine((v) => new Date(v).getTime() > Date.now(), "Choose a future date and time"), mode: z.enum(["video", "audio", "in_person"]), notes: z.string().optional(),
});
const rescheduleSchema = z.object({ start: z.string().min(1, "Choose date and time").refine((v) => new Date(v).getTime() > Date.now(), "Choose a future date and time") });
const statusSchema = z.object({ status: z.string().min(1) });

const live = ["scheduled", "link_shared", "joined", "live"];
const toLocalInput = (iso: string) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

export function AppointmentsView({ role, clientId }: { role: Role; clientId?: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  const { toast } = useToast(), confirm = useConfirm();
  const [scope, setScope] = useState("upcoming");
  const [mode, setMode] = useState<"list" | "calendar">("list");
  const [sel, setSel] = useState<string | null>(null);
  const [dlg, setDlg] = useState<"book" | "reschedule" | "status" | null>(null);
  const update = useUpdate("appointments");
  const base: Record<string, string | undefined> = role === "therapist" ? { therapistId: user?.id, ...(clientId ? { clientId } : {}) } : role === "client" ? { clientId: user?.id } : clientId ? { clientId } : {};
  const all = useList("appointments", { ...base, sort: "start", dir: "asc" });
  const current = all.data?.find((a) => a.id === sel) ?? null;
  useEffect(() => { if (sp.get("new")) setDlg("book"); if (sp.get("view")) setSel(sp.get("view")); }, [sp]);

  const clients = useList("clients", role === "therapist" ? { therapistId: user?.id } : {}, role !== "client");
  const services = useList("services", { status: "active" });
  const links = useList("therapist-links", { clientId: user?.id }, role === "client");
  const therapists = useList("therapists", { status: "active" }, role === "client");
  const book = useAction((v: z.infer<typeof bookSchema>) => api.post<Appointment>("/appointments", v), ["appointments"]);
  const share = useAction((id: string) => api.post<{ url: string }>(`/appointments/${id}/share-link`), ["appointments"]);
  const complete = useAction((id: string) => api.post(`/appointments/${id}/complete`, {}), ["appointments", "clients"]);

  const canManage = role !== "client";
  const fields: FieldDef[] = [
    role === "client"
      ? { name: "therapistId", label: "Therapist", type: "select", options: (links.data ?? []).filter((l) => l.status !== "ended").map((l) => ({ value: l.therapistId, label: l.therapistName })) }
      : { name: "clientId", label: "Client", type: "select", options: (clients.data ?? []).filter((c) => c.status === "active").map((c) => ({ value: c.id, label: c.name })) },
    { name: "serviceId", label: "Service", type: "select", options: (services.data ?? []).map((s) => ({ value: s.id, label: `${s.name} · ${money(s.price)}` })) },
    { name: "start", label: "Date & time", type: "datetime-local" }, { name: "mode", label: "Mode", type: "select", options: modeOptions },
    { name: "notes", label: "Notes (optional)", type: "textarea" },
  ];

  const act = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast(ok); } catch (e) { toast(e instanceof Error ? e.message : "Action failed", "error"); } };
  const cancel = async (a: Appointment) => {
    if (!(await confirm({ title: "Cancel this appointment?", description: `${fmtDateTime(a.start)} will be released. The other party will be notified.`, confirmLabel: "Cancel appointment", danger: true }))) return;
    await act(() => update.mutateAsync({ id: a.id, status: "cancelled" }), "Appointment cancelled");
  };
  const copyLink = (a: Appointment) => act(async () => {
    const r = await share.mutateAsync(a.id);
    await navigator.clipboard?.writeText(`${window.location.origin}${r.url}`).catch(() => undefined);
    await providers.notification.send({ channel: "email", to: a.clientName, template: "session-link" });
  }, "Secure session link copied & shared with client");
  const sync = (a: Appointment) => act(async () => {
    await providers.calendar.connect();
    await providers.calendar.syncEvent({ id: a.id, title: `Session: ${a.clientName}`, start: a.start, durationMin: a.duration });
    await update.mutateAsync({ id: a.id, calendarSynced: true });
  }, "Added to your calendar");

  const room = (a: Appointment) => `/${role === "client" ? "client" : "therapist"}/session/${a.id}`;
  const columns = [
    { key: "start", header: "When", sortable: true, render: (a: Appointment) => <div><div className="font-bold">{fmtDate(a.start)}</div><div className="text-[10px] text-muted">{fmtTime(a.start)} · {a.duration} min</div></div> },
    ...(role !== "client" ? [{ key: "clientName", header: "Client", sortable: true, render: (a: Appointment) => a.clientName }] : []),
    ...(role !== "therapist" ? [{ key: "therapistName", header: "Therapist", sortable: true, hideBelow: "md" as const }] : []),
    { key: "serviceName", header: "Service", hideBelow: "lg" as const },
    { key: "mode", header: "Mode", hideBelow: "sm" as const, render: (a: Appointment) => modeLabel[a.mode] },
    { key: "status", header: "Status", sortable: true, render: (a: Appointment) => <StatusBadge status={a.status} /> },
  ];

  return (
    <>
      <PageHeader eyebrow="Schedule" title="Appointments" subtitle={role === "client" ? "Your upcoming and past sessions." : "Manage bookings, session links and calendar sync."}
        actions={<>
          <div className="flex rounded-[10px] border border-line bg-white p-0.5">
            {([["list", List, "List"], ["calendar", CalendarDays, "Week"]] as const).map(([m, I, l]) => <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m} className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${mode === m ? "bg-rose text-wine" : "text-muted"}`}><I className="size-3.5" />{l}</button>)}
          </div>
          <Button icon={<Plus className="size-3.5" />} onClick={() => setDlg("book")}>{role === "client" ? "Book session" : "New appointment"}</Button>
        </>} />

      {mode === "list" ? (
        <DataTable resource="appointments" baseParams={{ ...base, scope: scope === "all" ? undefined : scope }} searchPlaceholder="Search client, therapist, service…" onRowClick={(a) => setSel(a.id)}
          defaultSort={{ key: "start", dir: scope === "past" ? "desc" : "asc" }} key={scope}
          tabs={<Tabs items={[{ id: "upcoming", label: "Upcoming" }, { id: "past", label: "Past" }, { id: "all", label: "All" }]} value={scope} onChange={setScope} />}
          filters={[{ key: "status", label: "Status", options: sessionStatusOptions }, { key: "mode", label: "Mode", options: modeOptions }]}
          emptyTitle={scope === "upcoming" ? "No upcoming appointments" : "No appointments found"} emptyDescription="Book a session to see it here." emptyAction={<Button onClick={() => setDlg("book")}>Book a session</Button>}
          columns={columns} />
      ) : (
        <Card hover={false} className="overflow-hidden">
          {all.isLoading ? <div className="p-4"><CardSkeleton rows={5} /></div> : all.isError ? <ErrorState onRetry={() => all.refetch()} /> : <WeekCalendar items={all.data ?? []} who={role === "client" ? "therapist" : "client"} onSelect={(a) => setSel(a.id)} />}
        </Card>
      )}

      <Drawer open={!!current} onClose={() => setSel(null)} title={current ? `${role === "client" ? current.therapistName : current.clientName}` : ""} description={current?.serviceName}
        footer={current && (
          <>
            {live.includes(current.status) && role !== "admin" && <Button icon={<Video className="size-3.5" />} onClick={() => router.push(room(current))}>{role === "client" ? "Join session" : "Start session"}</Button>}
            {current.status === "completed" && role !== "admin" && <Button variant="soft" onClick={() => router.push(`/${role}/sessions/${current.id}`)}>Session details</Button>}
            {live.includes(current.status) && <Button variant="danger" icon={<XCircle className="size-3.5" />} onClick={() => cancel(current)}>Cancel</Button>}
          </>
        )}>
        {current && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2"><StatusBadge status={current.status} /><StatusBadge status={current.paymentStatus} label={`Payment: ${current.paymentStatus}`} />{current.calendarSynced && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-ok"><Check className="size-3" />Calendar synced</span>}</div>
            <div className="grid grid-cols-2 gap-4">
              <KV label="Date & time">{fmtDateTime(current.start)}</KV><KV label="Duration">{current.duration} min</KV>
              <KV label="Mode">{modeLabel[current.mode]}</KV><KV label="Fee">{money(current.fee)}</KV>
              {role !== "client" && <KV label="Client">{current.clientName}</KV>}{role !== "therapist" && <KV label="Therapist">{current.therapistName}</KV>}
            </div>
            {current.notes && <KV label="Notes">{current.notes}</KV>}
            {live.includes(current.status) && (
              <div className="space-y-2 border-t border-line pt-4">
                <h3 className="text-xs font-extrabold">Manage</h3>
                <div className="flex flex-wrap gap-2">
                  {canManage && <Button variant="outline" size="sm" icon={current.status === "link_shared" ? <Copy className="size-3.5" /> : <Link2 className="size-3.5" />} loading={share.isPending} onClick={() => copyLink(current)}>{current.status === "link_shared" ? "Copy session link" : "Share secure link"}</Button>}
                  <Button variant="outline" size="sm" icon={<Pencil className="size-3.5" />} onClick={() => setDlg("reschedule")}>Reschedule</Button>
                  <Button variant="outline" size="sm" icon={<CalendarSync className="size-3.5" />} onClick={() => sync(current)}>{current.calendarSynced ? "Re-sync calendar" : "Add to calendar"}</Button>
                  {canManage && <Button variant="outline" size="sm" icon={<CalendarCheck className="size-3.5" />} onClick={() => confirm({ title: "Mark as completed?", description: "Use this if the session took place outside the platform.", confirmLabel: "Mark completed" }).then((ok) => { if (ok) return act(() => complete.mutateAsync(current.id), "Marked as completed"); })}>Mark completed</Button>}
                  {role === "admin" && <Button variant="outline" size="sm" onClick={() => setDlg("status")}>Change status</Button>}
                </div>
                {canManage && <p className="text-[10px] text-muted">Clients can join with the secure link before creating an account.</p>}
              </div>
            )}
            {current.status === "completed" && role !== "admin" && <Link href={`/${role}/sessions/${current.id}`} className="inline-block text-xs font-bold text-wine hover:underline">Open session summary →</Link>}
          </div>
        )}
      </Drawer>

      <FormDialog<z.infer<typeof bookSchema>> open={dlg === "book"} onClose={() => setDlg(null)} title={role === "client" ? "Book a session" : "New appointment"} description="Clients receive a notification and a secure session link." fields={fields} schema={bookSchema}
        defaultValues={{ clientId: role === "client" ? (user?.id ?? "") : (clientId ?? ""), therapistId: role === "client" ? (therapists.data?.[0]?.id ?? "") : undefined, serviceId: "", start: "", mode: "video", notes: "" } as never}
        successMessage="Appointment booked" onSubmit={(v) => book.mutateAsync({ ...v, clientId: role === "client" ? (user?.id ?? "") : v.clientId })} />
      <FormDialog<{ start: string }> open={dlg === "reschedule"} onClose={() => setDlg(null)} title="Reschedule appointment" fields={[{ name: "start", label: "New date & time", type: "datetime-local" }]} schema={rescheduleSchema}
        defaultValues={{ start: current ? toLocalInput(current.start) : "" } as never} successMessage="Appointment rescheduled" submitLabel="Reschedule"
        onSubmit={(v) => update.mutateAsync({ id: current!.id, start: new Date(v.start).toISOString(), status: "scheduled" })} />
      <FormDialog<{ status: string }> open={dlg === "status"} onClose={() => setDlg(null)} title="Change appointment status" fields={[{ name: "status", label: "Status", type: "select", options: sessionStatusOptions }]} schema={statusSchema}
        defaultValues={{ status: current?.status ?? "scheduled" } as never} successMessage="Status updated" onSubmit={(v) => update.mutateAsync({ id: current!.id, status: v.status as Appointment["status"] })} />
    </>
  );
}