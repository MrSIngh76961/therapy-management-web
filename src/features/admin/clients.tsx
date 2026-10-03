"use client";
import { Archive, Eye, Pencil, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Avatar, KV, StatusBadge } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Drawer } from "@/components/ui/overlay";
import { PageHeader } from "@/components/ui/page-header";
import { useConfirm } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";
import { useCreate, useList, useUpdate } from "@/hooks/useResource";
import { fmtDate } from "@/lib/format";
import { FormDialog } from "@/features/shared/form-dialog";
import { JourneyBadges } from "@/features/shared/labels";
import type { FieldDef } from "@/components/ui/entity-form";
import type { Client } from "@/services/types";

const schema = z.object({
  name: z.string().min(3, "Enter the client's full name"), email: z.string().email("Enter a valid email"), phone: z.string().min(8, "Enter a valid phone number"),
  age: z.number({ message: "Enter age" }).min(1, "Enter a valid age").max(110), gender: z.string().min(1, "Select gender"), therapistId: z.string().min(1, "Assign a therapist"),
  status: z.enum(["active", "inactive", "archived"]),
});

export function ClientsPage() {
  const [edit, setEdit] = useState<Client | "new" | null>(null);
  const [view, setView] = useState<Client | null>(null);
  const therapists = useList("therapists", { status: "active" });
  const create = useCreate("clients"), update = useUpdate("clients");
  const confirm = useConfirm(), { toast } = useToast();

  const fields: FieldDef[] = [
    { name: "name", label: "Full name", span: 2 }, { name: "email", label: "Email", type: "email" }, { name: "phone", label: "Phone", type: "tel" },
    { name: "age", label: "Age", type: "number", min: 1 }, { name: "gender", label: "Gender", type: "select", options: ["Female", "Male", "Non-binary", "Other"].map((v) => ({ value: v, label: v })) },
    { name: "therapistId", label: "Assigned therapist", type: "select", options: (therapists.data ?? []).map((t) => ({ value: t.id, label: t.name })) },
    { name: "status", label: "Status", type: "select", options: ["active", "inactive", "archived"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })) },
  ];
  const setStatus = async (c: Client, status: Client["status"]) => {
    const archive = status === "archived";
    if (!(await confirm({ title: `${archive ? "Archive" : "Restore"} ${c.name}?`, description: archive ? "Archived clients cannot be scheduled. Records are retained as per policy." : "The client will become active again.", confirmLabel: archive ? "Archive" : "Restore", danger: archive }))) return;
    try { await update.mutateAsync({ id: c.id, status }); toast(`${c.name} ${archive ? "archived" : "restored"}`); setView((v) => (v ? { ...v, status } : v)); } catch { toast("Could not update client", "error"); }
  };
  const save = (v: Client) => {
    const t = therapists.data?.find((x) => x.id === v.therapistId);
    const body = { ...v, therapistName: t?.name ?? "" };
    return edit === "new" ? create.mutateAsync({ ...body, onboarding: "invited", registration: "not_registered", joined: new Date().toISOString() }) : update.mutateAsync({ ...body, id: (edit as Client).id });
  };

  return (
    <>
      <PageHeader eyebrow="Practice" title="Client Management" subtitle="Clients across all therapists, including onboarding and consent progress." actions={<Button icon={<Plus className="size-3.5" />} onClick={() => setEdit("new")}>Add client</Button>} />
      <DataTable resource="clients" searchPlaceholder="Search name, email, therapist…" defaultSort={{ key: "name", dir: "asc" }} onRowClick={setView}
        filters={[
          { key: "status", label: "Status", options: ["active", "inactive", "archived"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })) },
          { key: "onboarding", label: "Consent", options: [{ value: "invited", label: "Invited" }, { value: "consent_pending", label: "Consent pending" }, { value: "consent_provided", label: "Consent provided" }] },
          { key: "registration", label: "Account", options: [{ value: "registered", label: "Registered" }, { value: "not_registered", label: "Not registered" }] },
        ]}
        rowActions={(c) => [
          { label: "View", icon: <Eye className="size-3.5" />, onSelect: () => setView(c) },
          { label: "Edit", icon: <Pencil className="size-3.5" />, onSelect: () => setEdit(c) },
          { label: "Archive", icon: <Archive className="size-3.5" />, danger: true, hidden: c.status === "archived", onSelect: () => setStatus(c, "archived") },
          { label: "Restore", icon: <RotateCcw className="size-3.5" />, hidden: c.status !== "archived", onSelect: () => setStatus(c, "active") },
        ]}
        emptyTitle="No clients yet" emptyDescription="Clients appear here once they are invited by a therapist or added by you." emptyAction={<Button onClick={() => setEdit("new")}>Add client</Button>}
        columns={[
          { key: "name", header: "Client", sortable: true, render: (c) => <div className="flex items-center gap-2.5"><Avatar name={c.name} size={32} /><div><div className="font-bold">{c.name}</div><div className="text-[10px] text-muted">{c.email}</div></div></div> },
          { key: "therapistName", header: "Therapist", sortable: true, hideBelow: "md" },
          { key: "journey", header: "Onboarding", hideBelow: "lg", render: (c) => <JourneyBadges client={c} /> },
          { key: "lastSession", header: "Last session", sortable: true, hideBelow: "sm", render: (c) => (c.lastSession ? fmtDate(c.lastSession) : "—") },
          { key: "status", header: "Status", sortable: true, render: (c) => <StatusBadge status={c.status} /> },
        ]}
      />
      <FormDialog<Client> open={!!edit} onClose={() => setEdit(null)} title={edit === "new" ? "Add client" : "Edit client"} fields={fields} schema={schema}
        defaultValues={(edit && edit !== "new" ? edit : { name: "", email: "", phone: "", age: 30, gender: "", therapistId: "", status: "active" }) as never}
        successMessage={edit === "new" ? "Client added" : "Client updated"} onSubmit={save} />
      <ClientDrawer c={view} onClose={() => setView(null)} onEdit={(c) => { setView(null); setEdit(c); }} onStatus={setStatus} />
    </>
  );
}

function ClientDrawer({ c, onClose, onEdit, onStatus }: { c: Client | null; onClose: () => void; onEdit: (c: Client) => void; onStatus: (c: Client, s: Client["status"]) => void }) {
  const appts = useList("appointments", { clientId: c?.id, sort: "start", dir: "desc" }, !!c);
  return (
    <Drawer open={!!c} onClose={onClose} title={c?.name ?? ""} description={c?.email}
      footer={c && <><Button variant="outline" icon={<Pencil className="size-3.5" />} onClick={() => onEdit(c)}>Edit</Button>{c.status === "archived" ? <Button onClick={() => onStatus(c, "active")}>Restore</Button> : <Button variant="danger" onClick={() => onStatus(c, "archived")}>Archive</Button>}</>}>
      {c && (
        <div className="space-y-5">
          <div className="flex items-center gap-3"><Avatar name={c.name} size={52} /><div className="space-y-1"><StatusBadge status={c.status} /><div><JourneyBadges client={c} /></div></div></div>
          <div className="grid grid-cols-2 gap-4"><KV label="Phone">{c.phone || "—"}</KV><KV label="Age / gender">{c.age} · {c.gender}</KV><KV label="Therapist">{c.therapistName}</KV><KV label="Joined">{fmtDate(c.joined)}</KV></div>
          <p className="rounded-xl bg-rose p-3 text-[11px] text-wine">Clinical notes and transcripts are not shown to clinic administrators.</p>
          <div>
            <h3 className="mb-2 text-xs font-extrabold">Appointments</h3>
            {appts.isLoading ? <div className="skeleton h-16" /> : !appts.data?.length ? <p className="text-xs text-muted">No appointments yet.</p> : (
              <ul className="space-y-1.5">{appts.data.slice(0, 6).map((a) => <li key={a.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-[11px]"><span>{fmtDate(a.start)} · {a.serviceName}</span><StatusBadge status={a.status} /></li>)}</ul>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}