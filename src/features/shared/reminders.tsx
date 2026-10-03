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

const channels = [["email", "Email"], ["sms", "SMS"], ["whatsapp", "WhatsApp"], ["in_app", "In-app"]].map(([value, label]) => ({ value, label }));
const schema = z.object({ title: z.string().min(3, "Add a title"), when: z.string().min(1, "Pick date and time"), channel: z.enum(["email", "sms", "whatsapp", "in_app"]), audience: z.enum(["client", "therapist"]) });
const local = (iso: string) => { const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); };

export function RemindersView() {
  const [form, setForm] = useState<Reminder | "new" | null>(null);
  const create = useCreate("reminders"), update = useUpdate("reminders"), remove = useRemove("reminders");
  const { toast } = useToast(), confirm = useConfirm();
  return (
    <>
      <PageHeader eyebrow="Automation" title="Reminders" subtitle="Scheduled nudges for sessions, tasks and follow-ups, delivered through your notification channels." actions={<Button icon={<Plus className="size-3.5" />} onClick={() => setForm("new")}>New reminder</Button>} />
      <DataTable resource="reminders" searchPlaceholder="Search reminders…" defaultSort={{ key: "when", dir: "asc" }}
        filters={[{ key: "status", label: "Status", options: ["scheduled", "sent", "paused"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })) }, { key: "channel", label: "Channel", options: channels }]}
        emptyTitle="No reminders" emptyDescription="Create one to keep clients on track." emptyAction={<Button onClick={() => setForm("new")}>New reminder</Button>}
        rowActions={(r) => [{ label: "Edit", icon: <Pencil className="size-3.5" />, onSelect: () => setForm(r) },
          ...(r.status !== "sent" ? [{ label: r.status === "paused" ? "Resume" : "Pause", icon: r.status === "paused" ? <Play className="size-3.5" /> : <Pause className="size-3.5" />, onSelect: () => update.mutate({ id: r.id, status: r.status === "paused" ? "scheduled" : "paused" }, { onSuccess: () => toast(r.status === "paused" ? "Reminder resumed" : "Reminder paused", "info") }) }] : []),
          { label: "Delete", icon: <Trash2 className="size-3.5" />, danger: true, onSelect: async () => { if (await confirm({ title: "Delete reminder?", description: "It will not be sent.", confirmLabel: "Delete", danger: true })) remove.mutate(r.id, { onSuccess: () => toast("Reminder deleted", "info") }); } }]}
        columns={[
          { key: "title", header: "Reminder", sortable: true, render: (r: Reminder) => <div className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-lg bg-rose text-wine"><Bell className="size-4" /></span><b>{r.title}</b></div> },
          { key: "when", header: "When", sortable: true, render: (r: Reminder) => fmtDateTime(r.when) },
          { key: "channel", header: "Channel", hideBelow: "sm" as const, render: (r: Reminder) => channels.find((c) => c.value === r.channel)?.label },
          { key: "audience", header: "To", hideBelow: "md" as const, render: (r: Reminder) => <span className="capitalize">{r.audience}</span> },
          { key: "status", header: "Status", sortable: true, render: (r: Reminder) => <StatusBadge status={r.status} /> },
        ]} />
      <FormDialog<Reminder> open={!!form} onClose={() => setForm(null)} title={form === "new" ? "New reminder" : "Edit reminder"} schema={schema} successMessage="Reminder saved"
        fields={[{ name: "title", label: "Title", span: 2 }, { name: "when", label: "Send at", type: "datetime-local" }, { name: "channel", label: "Channel", type: "select", options: channels }, { name: "audience", label: "Send to", type: "select", options: [{ value: "client", label: "Client" }, { value: "therapist", label: "Me" }] }]}
        defaultValues={(form && form !== "new" ? { ...form, when: local(form.when) } : { title: "", when: "", channel: "email", audience: "client" }) as never}
        onSubmit={(v) => { const body = { ...v, when: new Date(v.when).toISOString() }; return form === "new" ? create.mutateAsync({ ...body, status: "scheduled" }) : update.mutateAsync({ ...body, id: (form as Reminder).id }); }} />
    </>
  );
}