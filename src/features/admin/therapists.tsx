"use client";
import { Ban, CheckCircle2, Eye, Pencil, Plus, RotateCcw, Star, Stethoscope } from "lucide-react";
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
  name: z.string().min(3, "Enter the therapist's full name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(8, "Enter a valid phone number"),
  specialization: z.string().min(2, "Specialization is required"),
  license: z.string().min(3, "License number is required"),
  experience: z.number({ message: "Enter years of experience" }).min(0).max(60),
  fee: z.number({ message: "Enter a session fee" }).min(100, "Minimum fee is ₹100"),
  status: z.enum(["active", "pending", "suspended", "inactive"]),
});

const fields: FieldDef[] = [
  { name: "name", label: "Full clinician name", span: 2 },
  { name: "email", label: "Email address", type: "email" },
  { name: "phone", label: "Phone number", type: "tel" },
  { name: "specialization", label: "Clinical specialization" },
  { name: "license", label: "RCI license / registration number" },
  { name: "experience", label: "Experience (years)", type: "number", min: 0 },
  { name: "fee", label: "Session fee (₹)", type: "number", min: 100 },
  {
    name: "status",
    label: "Status",
    type: "select",
    options: ["active", "pending", "suspended", "inactive"].map((v) => ({
      value: v,
      label: v[0].toUpperCase() + v.slice(1),
    })),
  },
];

const blank = {
  name: "",
  email: "",
  phone: "",
  specialization: "",
  license: "",
  experience: 0,
  fee: 2000,
  status: "pending" as const,
};

export function TherapistsPage() {
  const sp = useSearchParams();
  const [edit, setEdit] = useState<Therapist | "new" | null>(null);
  const [view, setView] = useState<Therapist | null>(null);
  const create = useCreate("therapists");
  const update = useUpdate("therapists");
  const confirm = useConfirm();
  const { toast } = useToast();

  const setStatus = async (t: Therapist, status: Therapist["status"], verb: string) => {
    if (
      !(await confirm({
        title: `${verb} ${t.name}?`,
        description:
          status === "suspended"
            ? "They will lose access to the clinician portal and new client bookings will be blocked immediately."
            : `This will mark the clinician status as ${status}.`,
        confirmLabel: verb,
        danger: status === "suspended",
      }))
    )
      return;
    try {
      await update.mutateAsync({ id: t.id, status });
      toast(`${t.name} is now marked as ${status}`);
      setView((v) => (v ? { ...v, status } : v));
    } catch {
      toast("Could not update status", "error");
    }
  };

  const actions = (t: Therapist) => [
    { label: "View clinician profile", icon: <Eye className="size-3.5" />, onSelect: () => setView(t) },
    { label: "Edit details", icon: <Pencil className="size-3.5" />, onSelect: () => setEdit(t) },
    {
      label: "Approve credentials",
      icon: <CheckCircle2 className="size-3.5" />,
      hidden: t.status !== "pending",
      onSelect: () => setStatus(t, "active", "Approve"),
    },
    {
      label: "Suspend access",
      icon: <Ban className="size-3.5" />,
      danger: true,
      hidden: t.status !== "active",
      onSelect: () => setStatus(t, "suspended", "Suspend"),
    },
    {
      label: "Reactivate clinician",
      icon: <RotateCcw className="size-3.5" />,
      hidden: !["suspended", "inactive"].includes(t.status),
      onSelect: () => setStatus(t, "active", "Reactivate"),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Clinical Practice"
        title="Therapist Management"
        subtitle="Onboard, credential, approve and manage the clinical team in your practice."
        actions={
          <Button icon={<Plus className="size-3.5" />} onClick={() => setEdit("new")}>
            Add therapist
          </Button>
        }
      />
      <DataTable
        resource="therapists"
        searchPlaceholder="Search by name, email or clinical specialization…"
        initialFilters={sp.get("status") ? { status: sp.get("status") ?? "" } : undefined}
        filters={[
          {
            key: "status",
            label: "Status",
            options: ["active", "pending", "suspended", "inactive"].map((v) => ({
              value: v,
              label: v[0].toUpperCase() + v.slice(1),
            })),
          },
        ]}
        defaultSort={{ key: "name", dir: "asc" }}
        onRowClick={setView}
        rowActions={actions}
        emptyTitle="No therapists found"
        emptyDescription="Add your first therapist to configure slots and start accepting client bookings."
        emptyAction={<Button onClick={() => setEdit("new")}>Add therapist</Button>}
        columns={[
          {
            key: "name",
            header: "Clinician",
            sortable: true,
            render: (t) => (
              <div className="flex items-center gap-3">
                <Avatar name={t.name} size={36} />
                <div>
                  <div className="font-extrabold text-[#1F191D]">{t.name}</div>
                  <div className="text-[11px] text-[#6E686F]">{t.email}</div>
                </div>
              </div>
            ),
          },
          {
            key: "specialization",
            header: "Specialization",
            sortable: true,
            hideBelow: "md",
            render: (t) => (
              <span className="rounded-lg bg-[#FAF0F4] px-2 py-0.5 text-[11px] font-bold text-[#71102F]">
                {t.specialization}
              </span>
            ),
          },
          {
            key: "clientCount",
            header: "Active Clients",
            sortable: true,
            hideBelow: "sm",
            render: (t) => (
              <span className="font-bold text-[#1F191D]">
                {t.clientCount} <span className="text-[10px] text-[#888188]">clients</span>
              </span>
            ),
          },
          {
            key: "rating",
            header: "Rating",
            sortable: true,
            hideBelow: "lg",
            render: (t) =>
              t.rating ? (
                <span className="inline-flex items-center gap-1 font-bold text-[#D97706]">
                  <Star className="size-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                  {t.rating.toFixed(1)}
                </span>
              ) : (
                <span className="text-[#888188]">—</span>
              ),
          },
          {
            key: "fee",
            header: "Session Fee",
            sortable: true,
            hideBelow: "lg",
            render: (t) => <span className="font-extrabold">{money(t.fee)}</span>,
          },
          {
            key: "status",
            header: "Status",
            sortable: true,
            render: (t) => <StatusBadge status={t.status} />,
          },
        ]}
      />
      <FormDialog<Therapist>
        variant="drawer"
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit === "new" ? "Add new clinician" : "Edit clinician details"}
        description="Profile details become visible to prospective clients upon active approval."
        fields={fields}
        schema={schema}
        defaultValues={(edit && edit !== "new" ? edit : blank) as never}
        successMessage={edit === "new" ? "Therapist added to clinic" : "Therapist profile updated"}
        onSubmit={(v) =>
          edit === "new"
            ? create.mutateAsync({ ...v, rating: 0, clientCount: 0, joined: new Date().toISOString() })
            : update.mutateAsync({ ...v, id: (edit as Therapist).id })
        }
      />
      <TherapistDrawer
        t={view}
        onClose={() => setView(null)}
        onEdit={(t) => {
          setView(null);
          setEdit(t);
        }}
        onStatus={setStatus}
      />
    </>
  );
}

function TherapistDrawer({
  t,
  onClose,
  onEdit,
  onStatus,
}: {
  t: Therapist | null;
  onClose: () => void;
  onEdit: (t: Therapist) => void;
  onStatus: (t: Therapist, s: Therapist["status"], verb: string) => void;
}) {
  const appts = useList("appointments", { therapistId: t?.id, sort: "start", dir: "desc" }, !!t);
  return (
    <Drawer
      open={!!t}
      onClose={onClose}
      title={t?.name ?? ""}
      description={t?.specialization}
      footer={
        t && (
          <>
            <Button variant="outline" onClick={() => onEdit(t)} icon={<Pencil className="size-3.5" />}>
              Edit details
            </Button>
            {t.status === "pending" && (
              <Button onClick={() => onStatus(t, "active", "Approve")}>Approve credentials</Button>
            )}
            {t.status === "active" && (
              <Button variant="danger" onClick={() => onStatus(t, "suspended", "Suspend")}>
                Suspend
              </Button>
            )}
            {(t.status === "suspended" || t.status === "inactive") && (
              <Button onClick={() => onStatus(t, "active", "Reactivate")}>Reactivate</Button>
            )}
          </>
        )
      }
    >
      {t && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-white via-[#FFF8FA] to-[#FFF4F7] p-4 border border-[#EBC3D3]">
            <Avatar name={t.name} size={58} />
            <div>
              <div className="text-base font-black text-[#1F191D]">{t.name}</div>
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge status={t.status} />
                <span className="text-[11px] text-[#6E686F]">Joined {fmtDate(t.joined)}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-[#EDE4E8] bg-[#FAF7F8] p-4">
            <KV label="Email address">{t.email}</KV>
            <KV label="Phone">{t.phone}</KV>
            <KV label="RCI License / No.">{t.license}</KV>
            <KV label="Clinical Experience">{t.experience} years</KV>
            <KV label="Standard Session Fee">{money(t.fee)}</KV>
            <KV label="Active Client Caseload">{t.clientCount} clients</KV>
          </div>
          <div>
            <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-[#6E686F]">
              Recent Clinical Appointments
            </h3>
            {appts.isLoading ? (
              <div className="skeleton h-20 rounded-xl" />
            ) : !appts.data?.length ? (
              <p className="rounded-xl border border-dashed border-[#EDE4E8] p-6 text-center text-xs text-[#888188]">
                No recorded sessions for this clinician yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {appts.data.slice(0, 5).map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between rounded-xl border border-[#EDE4E8] bg-white p-3 text-xs shadow-xs"
                  >
                    <div>
                      <div className="font-bold text-[#1F191D]">{a.clientName}</div>
                      <div className="text-[10px] text-[#6E686F]">
                        {fmtDate(a.start)} · {a.duration} min
                      </div>
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
