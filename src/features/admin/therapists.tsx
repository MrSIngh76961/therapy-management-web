"use client";
import { Ban, CheckCircle2, Eye, Pencil, Plus, RotateCcw, Star } from "lucide-react";
import { useSearchParams } from "next/navigation";
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
import { fmtDate, money } from "@/lib/format";
import { FormDialog } from "@/features/shared/form-dialog";
import type { FieldDef } from "@/components/ui/entity-form";
import type { Therapist } from "@/services/types";

const schema = z.object({
  name: z.string().min(3, "Enter the therapist's full name"), email: z.string().email("Enter a valid email"), phone: z.string().min(8, "Enter a valid phone number"),
  specialization: z.string().min(2, "Specialization is required"), license: z.string().min(3, "License number is required"),
  experience: z.number({ message: "Enter years of experience" }).min(0).max(60), fee: z.number({ message: "Enter a session fee" }).min(100, "Minimum fee is ₹100"),
  status: z.enum(["active", "pending", "suspended", "inactive"]),
});
const fields: FieldDef[] = [
  { name: "name", label: "Full name", span: 2 }, { name: "email", label: "Email", type: "email" }, { name: "phone", label: "Phone", type: "tel" },
  { name: "specialization", label: "Specialization" }, { name: "license", label: "License / RCI number" },
  { name: "experience", label: "Experience (years)", type: "number", min: 0 }, { name: "fee", label: "Session fee (₹)", type: "number", min: 100 },
  { name: "status", label: "Status", type: "select", options: ["active", "pending", "suspended", "inactive"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })) },
];
const blank = { name: "", email: "", phone: "", specialization: "", license: "", experience: 0, fee: 2000, status: "pending" as const };

export function TherapistsPage() {
  const sp = useSearchParams();
  const [edit, setEdit] = useState<Therapist | "new" | null>(null);
  const [view, setView] = useState<Therapist | null>(null);
  const create = useCreate("therapists"), update = useUpdate("therapists");
  const confirm = useConfirm(), { toast } = useToast();

  const setStatus = async (t: Therapist, status: Therapist["status"], verb: string) => {
    if (!(await confirm({ title: `${verb} ${t.name}?`, description: status === "suspended" ? "They will lose access to the portal and new bookings will be blocked." : `This will mark the therapist as ${status}.`, confirmLabel: verb, danger: status === "suspended" }))) return;
    try { await update.mutateAsync({ id: t.id, status }); toast(`${t.name} is now ${status}`); setView((v) => (v ? { ...v, status } : v)); }
    catch { toast("Could not update status", "error"); }
  };
  const actions = (t: Therapist) => [
    { label: "View profile", icon: <Eye className="size-3.5" />, onSelect: () => setView(t) },
    { label: "Edit details", icon: <Pencil className="size-3.5" />, onSelect: () => setEdit(t) },
    { label: "Approve", icon: <CheckCircle2 className="size-3.5" />, hidden: t.status !== "pending", onSelect: () => setStatus(t, "active", "Approve") },
    { label: "Suspend", icon: <Ban className="size-3.5" />, danger: true, hidden: t.status !== "active", onSelect: () => setStatus(t, "suspended", "Suspend") },
    { label: "Reactivate", icon: <RotateCcw className="size-3.5" />, hidden: !["suspended", "inactive"].includes(t.status), onSelect: () => setStatus(t, "active", "Reactivate") },
  ];

  return (
    <>
      <PageHeader eyebrow="Practice" title="Therapist Management" subtitle="Onboard, approve and manage the clinicians in your practice." actions={<Button icon={<Plus className="size-3.5" />} onClick={() => setEdit("new")}>Add therapist</Button>} />
      <DataTable
        resource="therapists" searchPlaceholder="Search name, email or specialization…"
        initialFilters={sp.get("status") ? { status: sp.get("status") ?? "" } : undefined}
        filters={[{ key: "status", label: "Status", options: ["active", "pending", "suspended", "inactive"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })) }]}
        defaultSort={{ key: "name", dir: "asc" }} onRowClick={setView} rowActions={actions}
        emptyTitle="No therapists yet" emptyDescription="Add your first therapist to start scheduling sessions." emptyAction={<Button onClick={() => setEdit("new")}>Add therapist</Button>}
        columns={[
          { key: "name", header: "Therapist", sortable: true, render: (t) => <div className="flex items-center gap-2.5"><Avatar name={t.name} size={32} /><div><div className="font-bold">{t.name}</div><div className="text-[10px] text-muted">{t.email}</div></div></div> },
          { key: "specialization", header: "Specialization", sortable: true, hideBelow: "md" },
          { key: "clientCount", header: "Clients", sortable: true, hideBelow: "sm" },
          { key: "rating", header: "Rating", sortable: true, hideBelow: "lg", render: (t) => (t.rating ? <span className="inline-flex items-center gap-1"><Star className="size-3 fill-warn text-warn" />{t.rating}</span> : "—") },
          { key: "fee", header: "Fee", sortable: true, hideBelow: "lg", render: (t) => money(t.fee) },
          { key: "status", header: "Status", sortable: true, render: (t) => <StatusBadge status={t.status} /> },
        ]}
      />
      <FormDialog<Therapist> variant="drawer" open={!!edit} onClose={() => setEdit(null)} title={edit === "new" ? "Add therapist" : "Edit therapist"} description="Details are visible to clients after approval." fields={fields} schema={schema}
        defaultValues={(edit && edit !== "new" ? edit : blank) as never} successMessage={edit === "new" ? "Therapist added" : "Therapist updated"}
        onSubmit={(v) => (edit === "new" ? create.mutateAsync({ ...v, rating: 0, clientCount: 0, joined: new Date().toISOString() }) : update.mutateAsync({ ...v, id: (edit as Therapist).id }))} />
      <TherapistDrawer t={view} onClose={() => setView(null)} onEdit={(t) => { setView(null); setEdit(t); }} onStatus={setStatus} />
    </>
  );
}

function TherapistDrawer({ t, onClose, onEdit, onStatus }: { t: Therapist | null; onClose: () => void; onEdit: (t: Therapist) => void; onStatus: (t: Therapist, s: Therapist["status"], verb: string) => void }) {
  const appts = useList("appointments", { therapistId: t?.id, sort: "start", dir: "desc" }, !!t);
  return (
    <Drawer open={!!t} onClose={onClose} title={t?.name ?? ""} description={t?.specialization}
      footer={t && <>
        <Button variant="outline" onClick={() => onEdit(t)} icon={<Pencil className="size-3.5" />}>Edit</Button>
        {t.status === "pending" && <Button onClick={() => onStatus(t, "active", "Approve")}>Approve</Button>}
        {t.status === "active" && <Button variant="danger" onClick={() => onStatus(t, "suspended", "Suspend")}>Suspend</Button>}
        {(t.status === "suspended" || t.status === "inactive") && <Button onClick={() => onStatus(t, "active", "Reactivate")}>Reactivate</Button>}
      </>}>
      {t && (
        <div className="space-y-5">
          <div className="flex items-center gap-3"><Avatar name={t.name} size={52} /><div><StatusBadge status={t.status} /><div className="mt-1 text-[11px] text-muted">Joined {fmtDate(t.joined)}</div></div></div>
          <div className="grid grid-cols-2 gap-4"><KV label="Email">{t.email}</KV><KV label="Phone">{t.phone}</KV><KV label="License">{t.license}</KV><KV label="Experience">{t.experience} years</KV><KV label="Session fee">{money(t.fee)}</KV><KV label="Active clients">{t.clientCount}</KV></div>
          <div>
            <h3 className="mb-2 text-xs font-extrabold">Recent sessions</h3>
            {appts.isLoading ? <div className="skeleton h-16" /> : !appts.data?.length ? <p className="text-xs text-muted">No sessions yet.</p> : (
              <ul className="space-y-1.5">{appts.data.slice(0, 5).map((a) => <li key={a.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-[11px]"><span>{a.clientName} · {fmtDate(a.start)}</span><StatusBadge status={a.status} /></li>)}</ul>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}

