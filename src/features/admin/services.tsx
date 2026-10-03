"use client";
import { Pencil, Plus, Power, Trash2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { useConfirm } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";
import { useCreate, useRemove, useUpdate } from "@/hooks/useResource";
import { money } from "@/lib/format";
import { FormDialog } from "@/features/shared/form-dialog";
import { modeLabel } from "@/features/shared/labels";
import type { FieldDef } from "@/components/ui/entity-form";
import type { Service } from "@/services/types";

const schema = z.object({
  name: z.string().min(3, "Service name is required"), category: z.string().min(2, "Category is required"),
  duration: z.number({ message: "Enter duration" }).min(10, "Minimum 10 minutes").max(240), price: z.number({ message: "Enter price" }).min(0),
  gst: z.number({ message: "Enter GST %" }).min(0).max(28), mode: z.enum(["any", "video", "audio", "in_person"]), status: z.enum(["active", "inactive"]), description: z.string().optional(),
});
const fields: FieldDef[] = [
  { name: "name", label: "Service name", span: 2 }, { name: "category", label: "Category" },
  { name: "mode", label: "Delivery mode", type: "select", options: [{ value: "any", label: "Any" }, { value: "video", label: "Video" }, { value: "audio", label: "Audio" }, { value: "in_person", label: "In person" }] },
  { name: "duration", label: "Duration (min)", type: "number" }, { name: "price", label: "Price (₹, excl. GST)", type: "number" }, { name: "gst", label: "GST %", type: "number" },
  { name: "status", label: "Status", type: "select", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
  { name: "description", label: "Description", type: "textarea" },
];

export function ServicesPage() {
  const [edit, setEdit] = useState<Service | "new" | null>(null);
  const create = useCreate("services"), update = useUpdate("services"), remove = useRemove("services");
  const confirm = useConfirm(), { toast } = useToast();
  const toggle = async (s: Service) => {
    const next = s.status === "active" ? "inactive" : "active";
    try { await update.mutateAsync({ id: s.id, status: next }); toast(`${s.name} ${next === "active" ? "activated" : "deactivated"}`); } catch { toast("Could not update service", "error"); }
  };
  const del = async (s: Service) => {
    if (!(await confirm({ title: `Delete "${s.name}"?`, description: "Existing appointments keep their service name. This cannot be undone.", confirmLabel: "Delete", danger: true }))) return;
    try { await remove.mutateAsync(s.id); toast("Service deleted"); } catch { toast("Could not delete service", "error"); }
  };
  return (
    <>
      <PageHeader eyebrow="Practice" title="Services" subtitle="Define what you offer, how long it takes and what it costs." actions={<Button icon={<Plus className="size-3.5" />} onClick={() => setEdit("new")}>Add service</Button>} />
      <DataTable resource="services" searchPlaceholder="Search services…" defaultSort={{ key: "name", dir: "asc" }} onRowClick={setEdit}
        filters={[{ key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] }, { key: "category", label: "Category", options: ["Therapy", "Consultation", "Medical", "Group", "Assessment"].map((v) => ({ value: v, label: v })) }]}
        rowActions={(s) => [
          { label: "Edit", icon: <Pencil className="size-3.5" />, onSelect: () => setEdit(s) },
          { label: s.status === "active" ? "Deactivate" : "Activate", icon: <Power className="size-3.5" />, onSelect: () => toggle(s) },
          { label: "Delete", icon: <Trash2 className="size-3.5" />, danger: true, onSelect: () => del(s) },
        ]}
        emptyTitle="No services yet" emptyDescription="Create a service to make it bookable." emptyAction={<Button onClick={() => setEdit("new")}>Add service</Button>}
        columns={[
          { key: "name", header: "Service", sortable: true, render: (s) => <div><div className="font-bold">{s.name}</div><div className="text-[10px] text-muted">{s.category}</div></div> },
          { key: "mode", header: "Mode", hideBelow: "md", render: (s) => (s.mode === "any" ? "Any" : modeLabel[s.mode]) },
          { key: "duration", header: "Duration", sortable: true, hideBelow: "sm", render: (s) => `${s.duration} min` },
          { key: "price", header: "Price", sortable: true, render: (s) => <span>{money(s.price)} <span className="text-[10px] text-muted">+{s.gst}% GST</span></span> },
          { key: "status", header: "Status", sortable: true, render: (s) => <StatusBadge status={s.status} /> },
        ]}
      />
      <FormDialog<Service> open={!!edit} onClose={() => setEdit(null)} title={edit === "new" ? "Add service" : "Edit service"} fields={fields} schema={schema}
        defaultValues={(edit && edit !== "new" ? edit : { name: "", category: "Therapy", duration: 50, price: 2500, gst: 18, mode: "any", status: "active", description: "" }) as never}
        successMessage={edit === "new" ? "Service created" : "Service updated"} onSubmit={(v) => (edit === "new" ? create.mutateAsync(v) : update.mutateAsync({ ...v, id: (edit as Service).id }))} />
    </>
  );
}