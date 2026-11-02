"use client";
import { Archive, Eye, Pencil, Plus, RotateCcw, UserPlus } from "lucide-react";
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
  name: z.string().min(3, "Enter the client's full name"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().min(8, "Enter a valid phone number"),
  age: z.number({ message: "Enter age" }).min(1, "Enter a valid age").max(110),
  gender: z.string().min(1, "Select gender"),
  therapistId: z.string().min(1, "Assign a therapist"),
  status: z.enum(["active", "inactive", "archived"]),
});

export function ClientsPage() {
  const [edit, setEdit] = useState<Client | "new" | null>(null);
  const [view, setView] = useState<Client | null>(null);
  const therapists = useList("therapists", { status: "active" });
  const create = useCreate("clients");
  const update = useUpdate("clients");
  const confirm = useConfirm();
  const { toast } = useToast();

  const fields: FieldDef[] = [
    { name: "name", label: "Full client name", span: 2 },
    { name: "email", label: "Email address", type: "email" },
    { name: "phone", label: "Phone number", type: "tel" },
    { name: "age", label: "Age", type: "number", min: 1 },
    {
      name: "gender",
      label: "Gender",
      type: "select",
      options: ["Female", "Male", "Non-binary", "Other"].map((v) => ({ value: v, label: v })),
    },
    {
      name: "therapistId",
      label: "Assigned primary therapist",
      type: "select",
      options: (therapists.data ?? []).map((t) => ({ value: t.id, label: `${t.name} (${t.specialization})` })),
    },
    {
      name: "status",
      label: "Client status",
      type: "select",
      options: ["active", "inactive", "archived"].map((v) => ({
        value: v,
        label: v[0].toUpperCase() + v.slice(1),
      })),
    },
  ];

  const setStatus = async (c: Client, status: Client["status"]) => {
    const archive = status === "archived";
    if (
      !(await confirm({
        title: `${archive ? "Archive" : "Restore"} ${c.name}?`,
        description: archive
          ? "Archived clients cannot be scheduled for new sessions. Clinical history is preserved under DPDPA guidelines."
          : "The client record will be reinstated as active.",
        confirmLabel: archive ? "Archive client" : "Restore client",
        danger: archive,
      }))
    )
      return;
    try {
      await update.mutateAsync({ id: c.id, status });
      toast(`${c.name} has been ${archive ? "archived" : "restored"}`);
      setView((v) => (v ? { ...v, status } : v));
    } catch {
      toast("Could not update client status", "error");
    }
  };

  const save = (v: Client) => {
    const t = therapists.data?.find((x) => x.id === v.therapistId);
    const body = { ...v, therapistName: t?.name ?? "" };
    return edit === "new"
      ? create.mutateAsync({
          ...body,
          onboarding: "invited",
          registration: "not_registered",
          joined: new Date().toISOString(),
        })
      : update.mutateAsync({ ...body, id: (edit as Client).id });
  };

  return (
    <>
      <PageHeader
        eyebrow="Practice Management"
        title="Client Directory"
        subtitle="Manage client records across all clinicians, including DPDPA onboarding and account progress."
        actions={
          <Button icon={<Plus className="size-3.5" />} onClick={() => setEdit("new")}>
            Add client
          </Button>
        }
      />
      <DataTable
        resource="clients"
        searchPlaceholder="Search client name, email, or clinician…"
        defaultSort={{ key: "name", dir: "asc" }}
        onRowClick={setView}
        filters={[
          {
            key: "status",
            label: "Status",
            options: ["active", "inactive", "archived"].map((v) => ({
              value: v,
              label: v[0].toUpperCase() + v.slice(1),
            })),
          },
          {
            key: "onboarding",
            label: "Consent",
            options: [
              { value: "invited", label: "Invited" },
              { value: "consent_pending", label: "Consent pending" },
              { value: "consent_provided", label: "Consent provided" },
            ],
          },
          {
            key: "registration",
            label: "Portal account",
            options: [
              { value: "registered", label: "Registered" },
              { value: "not_registered", label: "Not registered" },
            ],
          },
        ]}
        rowActions={(c) => [
          { label: "View client profile", icon: <Eye className="size-3.5" />, onSelect: () => setView(c) },
          { label: "Edit details", icon: <Pencil className="size-3.5" />, onSelect: () => setEdit(c) },
          {
            label: "Archive client",
            icon: <Archive className="size-3.5" />,
            danger: true,
            hidden: c.status === "archived",
            onSelect: () => setStatus(c, "archived"),
          },
          {
            label: "Restore to active",
            icon: <RotateCcw className="size-3.5" />,
            hidden: c.status !== "archived",
            onSelect: () => setStatus(c, "active"),
          },
        ]}
        emptyTitle="No clients found"
        emptyDescription="Clients appear here once invited by your clinicians or added directly by you."
        emptyAction={<Button onClick={() => setEdit("new")}>Add client</Button>}
        columns={[
          {
            key: "name",
            header: "Client",
            sortable: true,
            render: (c) => (
              <div className="flex items-center gap-3">
                <Avatar name={c.name} size={36} />
                <div>
                  <div className="font-extrabold text-[#1F191D]">{c.name}</div>
                  <div className="text-[11px] text-[#6E686F]">{c.email}</div>
                </div>
              </div>
            ),
          },
          {
            key: "therapistName",
            header: "Assigned Clinician",
            sortable: true,
            hideBelow: "md",
            render: (c) => (
              <span className="font-bold text-[#71102F]">{c.therapistName}</span>
            ),
          },
          {
            key: "journey",
            header: "Onboarding & Consent",
            hideBelow: "lg",
            render: (c) => <JourneyBadges client={c} />,
          },
          {
            key: "lastSession",
            header: "Last Session",
            sortable: true,
            hideBelow: "sm",
            render: (c) => (c.lastSession ? fmtDate(c.lastSession) : <span className="text-[#888188]">—</span>),
          },
          {
            key: "status",
            header: "Status",
            sortable: true,
            render: (c) => <StatusBadge status={c.status} />,
          },
        ]}
      />
      <FormDialog<Client>
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit === "new" ? "Add new patient" : "Edit client information"}
        fields={fields}
        schema={schema}
        defaultValues={
          (edit && edit !== "new"
            ? edit
            : { name: "", email: "", phone: "", age: 30, gender: "", therapistId: "", status: "active" }) as never
        }
        successMessage={edit === "new" ? "Client successfully added" : "Client profile updated"}
        onSubmit={save}
      />
      <ClientDrawer
        c={view}
        onClose={() => setView(null)}
        onEdit={(c) => {
          setView(null);
          setEdit(c);
        }}
        onStatus={setStatus}
      />
    </>
  );
}

function ClientDrawer({
  c,
  onClose,
  onEdit,
  onStatus,
}: {
  c: Client | null;
  onClose: () => void;
  onEdit: (c: Client) => void;
  onStatus: (c: Client, s: Client["status"]) => void;
}) {
  const appts = useList("appointments", { clientId: c?.id, sort: "start", dir: "desc" }, !!c);
  return (
    <Drawer
      open={!!c}
      onClose={onClose}
      title={c?.name ?? ""}
      description={c?.email}
      footer={
        c && (
          <>
            <Button variant="outline" icon={<Pencil className="size-3.5" />} onClick={() => onEdit(c)}>
              Edit details
            </Button>
            {c.status === "archived" ? (
              <Button onClick={() => onStatus(c, "active")}>Restore client</Button>
            ) : (
              <Button variant="danger" onClick={() => onStatus(c, "archived")}>
                Archive client
              </Button>
            )}
          </>
        )
      }
    >
      {c && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-white via-[#FFF8FA] to-[#FFF4F7] p-4 border border-[#EBC3D3]">
            <Avatar name={c.name} size={58} />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-[#1F191D]">{c.name}</span>
                <StatusBadge status={c.status} />
              </div>
              <JourneyBadges client={c} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-[#EDE4E8] bg-[#FAF7F8] p-4">
            <KV label="Phone number">{c.phone || "—"}</KV>
            <KV label="Age / Gender">
              {c.age} yrs · {c.gender}
            </KV>
            <KV label="Assigned Clinician">{c.therapistName}</KV>
            <KV label="Onboarding Date">{fmtDate(c.joined)}</KV>
          </div>
          <div className="rounded-xl border border-[#EBC3D3] bg-[#FDECF1] p-3.5 text-xs text-[#71102F]">
            <b>DPDPA Privacy Notice:</b> Session clinical notes and live audio transcripts are private to the assigned therapist and are strictly excluded from clinic administrative views.
          </div>
          <div>
            <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-[#6E686F]">
              Recent Clinical Appointments
            </h3>
            {appts.isLoading ? (
              <div className="skeleton h-20 rounded-xl" />
            ) : !appts.data?.length ? (
              <p className="rounded-xl border border-dashed border-[#EDE4E8] p-6 text-center text-xs text-[#888188]">
                No appointments recorded for this client.
              </p>
            ) : (
              <ul className="space-y-2">
                {appts.data.slice(0, 6).map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between rounded-xl border border-[#EDE4E8] bg-white p-3 text-xs shadow-xs"
                  >
                    <div>
                      <div className="font-bold text-[#1F191D]">{a.serviceName}</div>
                      <div className="text-[10px] text-[#6E686F]">{fmtDate(a.start)}</div>
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
