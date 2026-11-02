"use client";
import { Clock, Pencil, Plus, Power, Trash2, Wrench } from "lucide-react";
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
  name: z.string().min(3, "Service name is required"),
  category: z.string().min(2, "Category is required"),
  duration: z.number({ message: "Enter duration" }).min(10, "Minimum 10 minutes").max(240),
  price: z.number({ message: "Enter price" }).min(0),
  gst: z.number({ message: "Enter GST %" }).min(0).max(28),
  mode: z.enum(["any", "video", "audio", "in_person"]),
  status: z.enum(["active", "inactive"]),
  description: z.string().optional(),
});

const fields: FieldDef[] = [
  { name: "name", label: "Service title", span: 2 },
  { name: "category", label: "Category" },
  {
    name: "mode",
    label: "Delivery mode",
    type: "select",
    options: [
      { value: "any", label: "Any (Client Choice)" },
      { value: "video", label: "Video Call" },
      { value: "audio", label: "Voice / Audio" },
      { value: "in_person", label: "In-Person Clinic Visit" },
    ],
  },
  { name: "duration", label: "Standard duration (minutes)", type: "number" },
  { name: "price", label: "Fee (₹, exclusive of GST)", type: "number" },
  { name: "gst", label: "Applicable GST %", type: "number" },
  {
    name: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
  },
  { name: "description", label: "Clinical service description", type: "textarea" },
];

export function ServicesPage() {
  const [edit, setEdit] = useState<Service | "new" | null>(null);
  const create = useCreate("services");
  const update = useUpdate("services");
  const remove = useRemove("services");
  const confirm = useConfirm();
  const { toast } = useToast();

  const toggle = async (s: Service) => {
    const next = s.status === "active" ? "inactive" : "active";
    try {
      await update.mutateAsync({ id: s.id, status: next });
      toast(`${s.name} ${next === "active" ? "activated" : "deactivated"}`);
    } catch {
      toast("Could not update service", "error");
    }
  };

  const del = async (s: Service) => {
    if (
      !(await confirm({
        title: `Delete "${s.name}"?`,
        description:
          "Existing appointments retain their booked service details. This action cannot be reversed.",
        confirmLabel: "Delete service",
        danger: true,
      }))
    )
      return;
    try {
      await remove.mutateAsync(s.id);
      toast("Service permanently removed");
    } catch {
      toast("Could not delete service", "error");
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Clinical Practice"
        title="Services & Pricing"
        subtitle="Define therapy consultations, durations, GST billing and delivery formats."
        actions={
          <Button icon={<Plus className="size-3.5" />} onClick={() => setEdit("new")}>
            Add service
          </Button>
        }
      />
      <DataTable
        resource="services"
        searchPlaceholder="Search services by title or category…"
        defaultSort={{ key: "name", dir: "asc" }}
        onRowClick={setEdit}
        filters={[
          {
            key: "status",
            label: "Status",
            options: [
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ],
          },
          {
            key: "category",
            label: "Category",
            options: ["Therapy", "Consultation", "Medical", "Group", "Assessment"].map((v) => ({
              value: v,
              label: v,
            })),
          },
        ]}
        rowActions={(s) => [
          { label: "Edit service", icon: <Pencil className="size-3.5" />, onSelect: () => setEdit(s) },
          {
            label: s.status === "active" ? "Deactivate" : "Activate",
            icon: <Power className="size-3.5" />,
            onSelect: () => toggle(s),
          },
          { label: "Delete", icon: <Trash2 className="size-3.5" />, danger: true, onSelect: () => del(s) },
        ]}
        emptyTitle="No services created"
        emptyDescription="Create a service to make it available for booking across your clinic."
        emptyAction={<Button onClick={() => setEdit("new")}>Add service</Button>}
        columns={[
          {
            key: "name",
            header: "Service",
            sortable: true,
            render: (s) => (
              <div>
                <div className="font-extrabold text-[#1F191D]">{s.name}</div>
                <div className="text-[11px] font-semibold text-[#888188]">{s.category}</div>
              </div>
            ),
          },
          {
            key: "mode",
            header: "Delivery Mode",
            hideBelow: "md",
            render: (s) => (
              <span className="rounded-lg bg-[#FAF0F4] px-2 py-0.5 text-[11px] font-bold text-[#71102F]">
                {s.mode === "any" ? "Any format" : modeLabel[s.mode]}
              </span>
            ),
          },
          {
            key: "duration",
            header: "Duration",
            sortable: true,
            hideBelow: "sm",
            render: (s) => (
              <span className="inline-flex items-center gap-1 font-bold text-[#4A4449]">
                <Clock className="size-3 text-[#888188]" />
                {s.duration} min
              </span>
            ),
          },
          {
            key: "price",
            header: "Clinical Fee",
            sortable: true,
            render: (s) => (
              <div>
                <span className="font-black text-[#1F191D]">{money(s.price)}</span>
                <span className="ml-1 rounded-md bg-[#FAF7F8] px-1 py-0.2 text-[10px] text-[#6E686F] border border-[#EDE4E8]">
                  +{s.gst}% GST
                </span>
              </div>
            ),
          },
          {
            key: "status",
            header: "Status",
            sortable: true,
            render: (s) => <StatusBadge status={s.status} />,
          },
        ]}
      />
      <FormDialog<Service>
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit === "new" ? "Add new service" : "Edit service"}
        fields={fields}
        schema={schema}
        defaultValues={
          (edit && edit !== "new"
            ? edit
            : {
                name: "",
                category: "Therapy",
                duration: 50,
                price: 2500,
                gst: 18,
                mode: "any",
                status: "active",
                description: "",
              }) as never
        }
        successMessage={edit === "new" ? "Service created" : "Service updated"}
        onSubmit={(v) =>
          edit === "new" ? create.mutateAsync(v) : update.mutateAsync({ ...v, id: (edit as Service).id })
        }
      />
    </>
  );
}
