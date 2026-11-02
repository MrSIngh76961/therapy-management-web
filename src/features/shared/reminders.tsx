"use client";
import { Bell, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { useCreate, useRemove, useUpdate } from "@/hooks/useResource";
import { fmtDateTime } from "@/lib/format";
import type { Reminder } from "@/services/types";
import { FormDialog } from "./form-dialog";

const channels = [
  ["email", "Email Notification"],
  ["sms", "SMS Alert"],
  ["whatsapp", "WhatsApp Message"],
  ["in_app", "In-App Notification"],
].map(([value, label]) => ({ value, label }));

const schema = z.object({
  title: z.string().min(3, "Add a title"),
  when: z.string().min(1, "Pick date and time"),
  channel: z.enum(["email", "sms", "whatsapp", "in_app"]),
  audience: z.enum(["client", "therapist"]),
});

const local = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
};

export function RemindersView() {
  const [form, setForm] = useState<Reminder | "new" | null>(null);
  const create = useCreate("reminders");
  const update = useUpdate("reminders");
  const remove = useRemove("reminders");
  const { toast } = useToast();
  const confirm = useConfirm();

  return (
    <>
      <PageHeader
        eyebrow="Care Automation"
        title="Automated Client Reminders"
        subtitle="Schedule automated nudges for upcoming sessions, care plans and homework follow-ups across multiple delivery channels."
        actions={
          <Button icon={<Plus className="size-3.5" />} onClick={() => setForm("new")}>
            New reminder
          </Button>
        }
      />
      <DataTable
        resource="reminders"
        searchPlaceholder="Search scheduled reminders by title…"
        defaultSort={{ key: "when", dir: "asc" }}
        filters={[
          {
            key: "status",
            label: "Status",
            options: ["scheduled", "sent", "paused"].map((v) => ({
              value: v,
              label: v[0].toUpperCase() + v.slice(1),
            })),
          },
          { key: "channel", label: "Channel", options: channels },
        ]}
        emptyTitle="No reminders scheduled"
        emptyDescription="Create an automated reminder to help clients stay punctual and engaged."
        emptyAction={<Button onClick={() => setForm("new")}>New reminder</Button>}
        rowActions={(r) => [
          { label: "Edit reminder", icon: <Pencil className="size-3.5" />, onSelect: () => setForm(r) },
          ...(r.status !== "sent"
            ? [
                {
                  label: r.status === "paused" ? "Resume reminder" : "Pause reminder",
                  icon: r.status === "paused" ? <Play className="size-3.5" /> : <Pause className="size-3.5" />,
                  onSelect: () =>
                    update.mutate(
                      { id: r.id, status: r.status === "paused" ? "scheduled" : "paused" },
                      {
                        onSuccess: () =>
                          toast(
                            r.status === "paused" ? "Reminder resumed" : "Reminder paused",
                            "info",
                          ),
                      },
                    ),
                },
              ]
            : []),
          {
            label: "Delete",
            icon: <Trash2 className="size-3.5" />,
            danger: true,
            onSelect: async () => {
              if (
                await confirm({
                  title: "Delete this scheduled reminder?",
                  description: "This reminder will be removed and will not be sent to the recipient.",
                  confirmLabel: "Delete reminder",
                  danger: true,
                })
              )
                remove.mutate(r.id, { onSuccess: () => toast("Reminder deleted", "info") });
            },
          },
        ]}
        columns={[
          {
            key: "title",
            header: "Reminder Subject",
            sortable: true,
            render: (r: Reminder) => (
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-[#FDECF1] to-[#F4DCE6] text-[#98143F] shadow-xs">
                  <Bell className="size-4" />
                </span>
                <span className="font-extrabold text-[#1F191D]">{r.title}</span>
              </div>
            ),
          },
          {
            key: "when",
            header: "Scheduled For",
            sortable: true,
            render: (r: Reminder) => fmtDateTime(r.when),
          },
          {
            key: "channel",
            header: "Delivery Channel",
            hideBelow: "sm",
            render: (r: Reminder) => (
              <span className="rounded-lg bg-[#FAF0F4] px-2 py-0.5 text-[11px] font-bold text-[#71102F]">
                {channels.find((c) => c.value === r.channel)?.label}
              </span>
            ),
          },
          {
            key: "audience",
            header: "Recipient",
            hideBelow: "md",
            render: (r: Reminder) => (
              <span className="capitalize font-semibold text-[#4A4449]">{r.audience}</span>
            ),
          },
          {
            key: "status",
            header: "Status",
            sortable: true,
            render: (r: Reminder) => <StatusBadge status={r.status} />,
          },
        ]}
      />
      <FormDialog<Reminder>
        open={!!form}
        onClose={() => setForm(null)}
        title={form === "new" ? "Schedule Care Reminder" : "Edit Reminder"}
        schema={schema}
        successMessage="Reminder scheduled"
        fields={[
          { name: "title", label: "Reminder title", span: 2 },
          { name: "when", label: "Dispatch date & time", type: "datetime-local" },
          { name: "channel", label: "Communication channel", type: "select", options: channels },
          {
            name: "audience",
            label: "Recipient group",
            type: "select",
            options: [
              { value: "client", label: "Client" },
              { value: "therapist", label: "Self (Clinician)" },
            ],
          },
        ]}
        defaultValues={
          (form && form !== "new"
            ? { ...form, when: local(form.when) }
            : { title: "", when: "", channel: "email", audience: "client" }) as never
        }
        onSubmit={(v) => {
          const body = { ...v, when: new Date(v.when).toISOString() };
          return form === "new"
            ? create.mutateAsync({ ...body, status: "scheduled" })
            : update.mutateAsync({ ...body, id: (form as Reminder).id });
        }}
      />
    </>
  );
}
