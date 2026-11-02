"use client";
import {
  CalendarCheck,
  CalendarDays,
  CalendarSync,
  Check,
  Copy,
  Link2,
  List,
  Pencil,
  Plus,
  Video,
  XCircle,
} from "lucide-react";
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
  clientId: z.string().min(1, "Select a client"),
  therapistId: z.string().optional(),
  serviceId: z.string().min(1, "Select a service"),
  start: z
    .string()
    .min(1, "Choose date and time")
    .refine((v) => new Date(v).getTime() > Date.now(), "Choose a future date and time"),
  mode: z.enum(["video", "audio", "in_person"]),
  notes: z.string().optional(),
});
const rescheduleSchema = z.object({
  start: z
    .string()
    .min(1, "Choose date and time")
    .refine((v) => new Date(v).getTime() > Date.now(), "Choose a future date and time"),
});
const statusSchema = z.object({ status: z.string().min(1) });

const live = ["scheduled", "link_shared", "joined", "live"];
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export function AppointmentsView({ role, clientId }: { role: Role; clientId?: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [scope, setScope] = useState("upcoming");
  const [mode, setMode] = useState<"list" | "calendar">("list");
  const [sel, setSel] = useState<string | null>(null);
  const [dlg, setDlg] = useState<"book" | "reschedule" | "status" | null>(null);
  const update = useUpdate("appointments");
  const base: Record<string, string | undefined> =
    role === "therapist"
      ? { therapistId: user?.id, ...(clientId ? { clientId } : {}) }
      : role === "client"
      ? { clientId: user?.id }
      : clientId
      ? { clientId }
      : {};
  const all = useList("appointments", { ...base, sort: "start", dir: "asc" });
  const current = all.data?.find((a) => a.id === sel) ?? null;

  useEffect(() => {
    if (sp.get("new")) setDlg("book");
    if (sp.get("view")) setSel(sp.get("view"));
  }, [sp]);

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
      ? {
          name: "therapistId",
          label: "Assigned therapist",
          type: "select",
          options: (links.data ?? [])
            .filter((l) => l.status !== "ended")
            .map((l) => ({ value: l.therapistId, label: l.therapistName })),
        }
      : {
          name: "clientId",
          label: "Select client",
          type: "select",
          options: (clients.data ?? [])
            .filter((c) => c.status === "active")
            .map((c) => ({ value: c.id, label: c.name })),
        },
    {
      name: "serviceId",
      label: "Consultation service",
      type: "select",
      options: (services.data ?? []).map((s) => ({ value: s.id, label: `${s.name} · ${money(s.price)}` })),
    },
    { name: "start", label: "Session date & time", type: "datetime-local" },
    { name: "mode", label: "Delivery mode", type: "select", options: modeOptions },
    { name: "notes", label: "Clinical or intake notes (optional)", type: "textarea" },
  ];

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast(ok);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Action failed", "error");
    }
  };

  const cancel = async (a: Appointment) => {
    if (
      !(await confirm({
        title: "Cancel this appointment?",
        description: `${fmtDateTime(a.start)} will be released from clinician schedule. The client and practitioner will receive cancellation alerts.`,
        confirmLabel: "Cancel appointment",
        danger: true,
      }))
    )
      return;
    await act(() => update.mutateAsync({ id: a.id, status: "cancelled" }), "Appointment cancelled");
  };

  const copyLink = (a: Appointment) =>
    act(async () => {
      const r = await share.mutateAsync(a.id);
      await navigator.clipboard?.writeText(`${window.location.origin}${r.url}`).catch(() => undefined);
      await providers.notification.send({ channel: "email", to: a.clientName, template: "session-link" });
    }, "Secure session link copied & notification sent to client");

  const sync = (a: Appointment) =>
    act(async () => {
      await providers.calendar.connect();
      await providers.calendar.syncEvent({
        id: a.id,
        title: `TheraFlow Session: ${a.clientName}`,
        start: a.start,
        durationMin: a.duration,
      });
      await update.mutateAsync({ id: a.id, calendarSynced: true });
    }, "Appointment synchronized with your calendar");

  const room = (a: Appointment) => `/${role === "client" ? "client" : "therapist"}/session/${a.id}`;
  const columns = [
    {
      key: "start",
      header: "Appointment Time",
      sortable: true,
      render: (a: Appointment) => (
        <div>
          <div className="font-extrabold text-[#1F191D]">{fmtDate(a.start)}</div>
          <div className="text-[10px] text-[#6E686F]">
            {fmtTime(a.start)} · {a.duration} min
          </div>
        </div>
      ),
    },
    ...(role !== "client"
      ? [
          {
            key: "clientName",
            header: "Patient",
            sortable: true,
            render: (a: Appointment) => <span className="font-bold text-[#1F191D]">{a.clientName}</span>,
          },
        ]
      : []),
    ...(role !== "therapist"
      ? [
          {
            key: "therapistName",
            header: "Clinician",
            sortable: true,
            hideBelow: "md" as const,
            render: (a: Appointment) => <span className="font-bold text-[#71102F]">{a.therapistName}</span>,
          },
        ]
      : []),
    {
      key: "serviceName",
      header: "Service",
      hideBelow: "lg" as const,
      render: (a: Appointment) => <span className="text-[#4A4449]">{a.serviceName}</span>,
    },
    {
      key: "mode",
      header: "Format",
      hideBelow: "sm" as const,
      render: (a: Appointment) => (
        <span className="rounded-lg bg-[#FAF0F4] px-2 py-0.5 text-[11px] font-bold text-[#71102F]">
          {modeLabel[a.mode]}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (a: Appointment) => <StatusBadge status={a.status} />,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Clinical Schedule"
        title="Appointments"
        subtitle={
          role === "client"
            ? "Your confirmed upcoming sessions and previous consultations."
            : "Manage consultation bookings, generate secure video links and sync calendars."
        }
        actions={
          <>
            <div className="flex rounded-[12px] border border-[#EDE4E8] bg-white p-0.5 shadow-xs">
              {(
                [
                  ["list", List, "List View"],
                  ["calendar", CalendarDays, "Week Grid"],
                ] as const
              ).map(([m, I, l]) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                  className={`flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-bold transition-all ${
                    mode === m
                      ? "border border-[#EBC3D3] bg-[#F4DCE6] text-[#71102F] shadow-xs"
                      : "text-[#6E686F] hover:text-[#98143F]"
                  }`}
                >
                  <I className="size-3.5" />
                  {l}
                </button>
              ))}
            </div>
            <Button icon={<Plus className="size-3.5" />} onClick={() => setDlg("book")}>
              {role === "client" ? "Book session" : "New appointment"}
            </Button>
          </>
        }
      />

      {mode === "list" ? (
        <DataTable
          resource="appointments"
          baseParams={{ ...base, scope: scope === "all" ? undefined : scope }}
          searchPlaceholder="Search by client, therapist, or service…"
          onRowClick={(a) => setSel(a.id)}
          defaultSort={{ key: "start", dir: scope === "past" ? "desc" : "asc" }}
          key={scope}
          tabs={
            <Tabs
              items={[
                { id: "upcoming", label: "Upcoming Bookings" },
                { id: "past", label: "Completed / Past" },
                { id: "all", label: "All Sessions" },
              ]}
              value={scope}
              onChange={setScope}
            />
          }
          filters={[
            { key: "status", label: "Session status", options: sessionStatusOptions },
            { key: "mode", label: "Delivery mode", options: modeOptions },
          ]}
          emptyTitle={scope === "upcoming" ? "No upcoming appointments" : "No appointments found"}
          emptyDescription="Schedule a consultation to see it appear here."
          emptyAction={<Button onClick={() => setDlg("book")}>Book appointment</Button>}
          columns={columns}
        />
      ) : (
        <Card hover={false} className="overflow-hidden border border-[#EDE4E8] bg-white p-2 shadow-card">
          {all.isLoading ? (
            <div className="p-6">
              <CardSkeleton rows={5} />
            </div>
          ) : all.isError ? (
            <ErrorState onRetry={() => all.refetch()} />
          ) : (
            <WeekCalendar
              items={all.data ?? []}
              who={role === "client" ? "therapist" : "client"}
              onSelect={(a) => setSel(a.id)}
            />
          )}
        </Card>
      )}

      <Drawer
        open={!!current}
        onClose={() => setSel(null)}
        title={current ? (role === "client" ? current.therapistName : current.clientName) : ""}
        description={current?.serviceName}
        footer={
          current && (
            <>
              {live.includes(current.status) && role !== "admin" && (
                <Button icon={<Video className="size-3.5" />} onClick={() => router.push(room(current))}>
                  {role === "client" ? "Join session now" : "Open session room"}
                </Button>
              )}
              {current.status === "completed" && role !== "admin" && (
                <Button variant="soft" onClick={() => router.push(`/${role}/sessions/${current.id}`)}>
                  View session notes
                </Button>
              )}
              {live.includes(current.status) && (
                <Button
                  variant="danger"
                  icon={<XCircle className="size-3.5" />}
                  onClick={() => cancel(current)}
                >
                  Cancel booking
                </Button>
              )}
            </>
          )
        }
      >
        {current && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={current.status} />
              <StatusBadge status={current.paymentStatus} label={`Payment: ${current.paymentStatus}`} />
              {current.calendarSynced && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#D0F3E5] px-2.5 py-0.5 text-[10px] font-black text-[#065F46]">
                  <Check className="size-3" />
                  Synced to Calendar
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-[#EDE4E8] bg-[#FAF7F8] p-4">
              <KV label="Scheduled Time">{fmtDateTime(current.start)}</KV>
              <KV label="Duration">{current.duration} minutes</KV>
              <KV label="Delivery Format">{modeLabel[current.mode]}</KV>
              <KV label="Consultation Fee">{money(current.fee)}</KV>
              {role !== "client" && <KV label="Client">{current.clientName}</KV>}
              {role !== "therapist" && <KV label="Practitioner">{current.therapistName}</KV>}
            </div>
            {current.notes && (
              <div className="rounded-xl border border-[#EDE4E8] bg-white p-4">
                <KV label="Clinical Notes / Intake">{current.notes}</KV>
              </div>
            )}
            {live.includes(current.status) && (
              <div className="space-y-3 rounded-xl border border-[#EBC3D3] bg-[#FDECF1] p-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#71102F]">
                  Session Actions & Controls
                </h3>
                <div className="flex flex-wrap gap-2">
                  {canManage && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={current.status === "link_shared" ? <Copy className="size-3.5" /> : <Link2 className="size-3.5" />}
                      loading={share.isPending}
                      onClick={() => copyLink(current)}
                    >
                      {current.status === "link_shared" ? "Copy secure token link" : "Generate & share link"}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Pencil className="size-3.5" />}
                    onClick={() => setDlg("reschedule")}
                  >
                    Reschedule
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<CalendarSync className="size-3.5" />}
                    onClick={() => sync(current)}
                  >
                    {current.calendarSynced ? "Re-sync calendar" : "Add to calendar"}
                  </Button>
                  {canManage && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<CalendarCheck className="size-3.5" />}
                      onClick={() =>
                        confirm({
                          title: "Mark session as completed?",
                          description:
                            "Use this if the consultation took place offline or outside the virtual room.",
                          confirmLabel: "Mark as completed",
                        }).then((ok) => {
                          if (ok) return act(() => complete.mutateAsync(current.id), "Session marked as completed");
                        })
                      }
                    >
                      Mark completed
                    </Button>
                  )}
                  {role === "admin" && (
                    <Button variant="outline" size="sm" onClick={() => setDlg("status")}>
                      Change status
                    </Button>
                  )}
                </div>
                {canManage && (
                  <p className="text-[11px] text-[#6E686F]">
                    Clients can enter and give consent using the secure token link without creating an account in advance.
                  </p>
                )}
              </div>
            )}
            {current.status === "completed" && role !== "admin" && (
              <Link
                href={`/${role}/sessions/${current.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#98143F] hover:underline"
              >
                Open clinical session summary & transcript →
              </Link>
            )}
          </div>
        )}
      </Drawer>

      <FormDialog<z.infer<typeof bookSchema>>
        open={dlg === "book"}
        onClose={() => setDlg(null)}
        title={role === "client" ? "Book Therapy Consultation" : "Schedule New Appointment"}
        description="Clients automatically receive email confirmation and a one-click session link."
        fields={fields}
        schema={bookSchema}
        defaultValues={
          {
            clientId: role === "client" ? user?.id ?? "" : clientId ?? "",
            therapistId: role === "client" ? therapists.data?.[0]?.id ?? "" : undefined,
            serviceId: "",
            start: "",
            mode: "video",
            notes: "",
          } as never
        }
        successMessage="Appointment booked"
        onSubmit={(v) =>
          book.mutateAsync({ ...v, clientId: role === "client" ? user?.id ?? "" : v.clientId })
        }
      />
      <FormDialog<{ start: string }>
        open={dlg === "reschedule"}
        onClose={() => setDlg(null)}
        title="Reschedule Appointment"
        fields={[{ name: "start", label: "New consultation date & time", type: "datetime-local" }]}
        schema={rescheduleSchema}
        defaultValues={{ start: current ? toLocalInput(current.start) : "" } as never}
        successMessage="Appointment rescheduled"
        submitLabel="Confirm reschedule"
        onSubmit={(v) =>
          update.mutateAsync({ id: current!.id, start: new Date(v.start).toISOString(), status: "scheduled" })
        }
      />
      <FormDialog<{ status: string }>
        open={dlg === "status"}
        onClose={() => setDlg(null)}
        title="Change Appointment Status"
        fields={[{ name: "status", label: "Select status", type: "select", options: sessionStatusOptions }]}
        schema={statusSchema}
        defaultValues={{ status: current?.status ?? "scheduled" } as never}
        successMessage="Status updated"
        onSubmit={(v) =>
          update.mutateAsync({ id: current!.id, status: v.status as Appointment["status"] })
        }
      />
    </>
  );
}
