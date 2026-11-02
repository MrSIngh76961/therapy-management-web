"use client";
import { Lock, Pencil, Plus, Power, Save, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Avatar, Card, StatusBadge } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { CardSkeleton, ErrorState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { useConfirm } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";
import { useAction, useApiQuery, useCreate, useUpdate } from "@/hooks/useResource";
import { cn } from "@/lib/cn";
import { fmtDate } from "@/lib/format";
import { api } from "@/services/api";
import type { ClinicUser, PermissionMatrix } from "@/services/types";
import { FormDialog } from "@/features/shared/form-dialog";

const roles = ["Owner", "Admin", "Manager", "Front Desk", "Billing"];
const schema = z.object({
  name: z.string().min(3, "Enter full name"),
  email: z.string().email("Enter a valid email"),
  role: z.string().min(1, "Select a role"),
  status: z.enum(["active", "pending", "inactive"]),
});
const actions = ["view", "create", "edit", "delete"];

export function UsersPage() {
  const [tab, setTab] = useState("users");
  const [edit, setEdit] = useState<ClinicUser | "new" | null>(null);
  const create = useCreate("users");
  const update = useUpdate("users");
  const confirm = useConfirm();
  const { toast } = useToast();

  const toggle = async (u: ClinicUser) => {
    const next = u.status === "inactive" ? "active" : "inactive";
    if (u.role === "Owner") return toast("The clinic owner cannot be deactivated", "error");
    if (
      !(await confirm({
        title: `${next === "inactive" ? "Deactivate" : "Activate"} ${u.name}?`,
        description:
          next === "inactive"
            ? "They will be immediately signed out and will lose workspace access."
            : "They will regain access with their current assigned permissions.",
        confirmLabel: next === "inactive" ? "Deactivate" : "Activate",
        danger: next === "inactive",
      }))
    )
      return;
    try {
      await update.mutateAsync({ id: u.id, status: next });
      toast(`${u.name} ${next === "inactive" ? "deactivated" : "activated"}`);
    } catch {
      toast("Could not update user", "error");
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Access Control"
        title="Users & Permissions"
        subtitle="Manage clinic administrators, front-desk staff, billing officers and role-based capabilities."
        actions={
          tab === "users" ? (
            <Button icon={<Plus className="size-3.5" />} onClick={() => setEdit("new")}>
              Invite user
            </Button>
          ) : undefined
        }
      />
      <Tabs
        className="mb-5 w-fit"
        value={tab}
        onChange={setTab}
        items={[
          { id: "users", label: "Clinic Team Members" },
          { id: "roles", label: "Role Permission Matrix" },
        ]}
      />
      {tab === "users" ? (
        <DataTable
          resource="users"
          searchPlaceholder="Search staff by name or email…"
          defaultSort={{ key: "name", dir: "asc" }}
          onRowClick={setEdit}
          filters={[
            { key: "role", label: "Role", options: roles.map((r) => ({ value: r, label: r })) },
            {
              key: "status",
              label: "Status",
              options: ["active", "pending", "inactive"].map((v) => ({
                value: v,
                label: v[0].toUpperCase() + v.slice(1),
              })),
            },
          ]}
          rowActions={(u) => [
            { label: "Edit user", icon: <Pencil className="size-3.5" />, onSelect: () => setEdit(u) },
            {
              label: u.status === "inactive" ? "Activate" : "Deactivate",
              icon: <Power className="size-3.5" />,
              onSelect: () => toggle(u),
              danger: u.status !== "inactive",
            },
          ]}
          emptyTitle="No team members found"
          emptyDescription="Invite administrative or front-desk staff to collaborate."
          emptyAction={<Button onClick={() => setEdit("new")}>Invite user</Button>}
          columns={[
            {
              key: "name",
              header: "Team Member",
              sortable: true,
              render: (u: ClinicUser) => (
                <div className="flex items-center gap-3">
                  <Avatar name={u.name} size={36} />
                  <div>
                    <div className="font-extrabold text-[#1F191D]">{u.name}</div>
                    <div className="text-[11px] text-[#6E686F]">{u.email}</div>
                  </div>
                </div>
              ),
            },
            {
              key: "role",
              header: "Assigned Role",
              sortable: true,
              render: (u: ClinicUser) => (
                <span className="rounded-lg bg-[#FAF0F4] px-2.5 py-0.5 text-xs font-bold text-[#71102F]">
                  {u.role}
                </span>
              ),
            },
            {
              key: "lastLogin",
              header: "Last Active",
              sortable: true,
              hideBelow: "md",
              render: (u: ClinicUser) => (
                <span className="text-[#6E686F]">{fmtDate(u.lastLogin)}</span>
              ),
            },
            {
              key: "status",
              header: "Status",
              sortable: true,
              render: (u: ClinicUser) => <StatusBadge status={u.status} />,
            },
          ]}
        />
      ) : (
        <PermissionMatrixCard />
      )}
      <FormDialog<ClinicUser>
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit === "new" ? "Invite team member" : "Edit staff member"}
        description={
          edit === "new"
            ? "An invitation email will be dispatched with a one-time onboarding link."
            : undefined
        }
        submitLabel={edit === "new" ? "Send invite" : "Save changes"}
        fields={[
          { name: "name", label: "Full staff member name", span: 2 },
          { name: "email", label: "Official email address", type: "email" },
          {
            name: "role",
            label: "Role",
            type: "select",
            options: roles.map((r) => ({ value: r, label: r })),
          },
          {
            name: "status",
            label: "Access status",
            type: "select",
            options: ["active", "pending", "inactive"].map((v) => ({
              value: v,
              label: v[0].toUpperCase() + v.slice(1),
            })),
          },
        ]}
        schema={schema}
        defaultValues={
          (edit && edit !== "new"
            ? edit
            : { name: "", email: "", role: "Front Desk", status: "pending" }) as never
        }
        successMessage={edit === "new" ? "Team invitation sent" : "User updated"}
        onSubmit={(v) =>
          edit === "new"
            ? create.mutateAsync({ ...v, lastLogin: new Date().toISOString() })
            : update.mutateAsync({ ...v, id: (edit as ClinicUser).id })
        }
      />
    </>
  );
}

function PermissionMatrixCard() {
  const q = useApiQuery<PermissionMatrix>(["settings", "permissions"], "/settings/permissions");
  const [draft, setDraft] = useState<PermissionMatrix | null>(null);
  const [role, setRole] = useState("Admin");
  const { toast } = useToast();
  const save = useAction(
    (m: PermissionMatrix) => api.put("/settings/permissions", m),
    ["settings"],
  );

  useEffect(() => {
    if (q.data) setDraft(q.data);
  }, [q.data]);

  if (q.isLoading || !draft) return <CardSkeleton rows={5} />;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;

  const dirty = JSON.stringify(draft) !== JSON.stringify(q.data);
  const locked = role === "Owner";

  const flip = (m: string, a: string) =>
    setDraft((d) => {
      const cur = d![role][m];
      const next = cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a];
      return { ...d!, [role]: { ...d![role], [m]: next } };
    });

  return (
    <Card hover={false} className="overflow-hidden border border-[#EDE4E8] bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0E6EB] bg-gradient-to-r from-white via-[#FFFBFD] to-[#FFF3EF] p-4">
        <Tabs value={role} onChange={setRole} items={roles.map((r) => ({ id: r, label: r }))} />
        <div className="flex items-center gap-3">
          {locked && (
            <span className="flex items-center gap-1.5 rounded-full bg-[#FAF7F8] px-3 py-1 text-xs font-bold text-[#6E686F] border border-[#EDE4E8]">
              <Lock className="size-3.5 text-[#98143F]" />
              Clinic Owner has permanent full access
            </span>
          )}
          <Button
            icon={<Save className="size-3.5" />}
            disabled={!dirty}
            loading={save.isPending}
            onClick={async () => {
              try {
                await save.mutateAsync(draft);
                toast("Permission matrix updated");
              } catch {
                toast("Could not save permissions", "error");
              }
            }}
          >
            Save changes
          </Button>
        </div>
      </div>
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#EDE4E8] bg-[#FAF5F7]">
              {["Module", ...actions].map((h) => (
                <th
                  key={h}
                  className="p-3.5 text-left text-[10px] font-black uppercase tracking-wider text-[#716A70]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4ECF0]">
            {Object.keys(draft[role]).map((m) => (
              <tr key={m} className="transition-colors hover:bg-[#FFF8FA]">
                <td className="p-3.5 font-black text-[#1F191D]">{m}</td>
                {actions.map((a) => {
                  const on = draft[role][m].includes(a);
                  return (
                    <td key={a} className="p-3.5">
                      <button
                        disabled={locked}
                        role="checkbox"
                        aria-checked={on}
                        aria-label={`${role} can ${a} ${m}`}
                        onClick={() => flip(m, a)}
                        className={cn(
                          "grid size-6 place-items-center rounded-lg border text-xs font-black transition-all disabled:opacity-60",
                          on
                            ? "border-[#98143F] bg-gradient-to-br from-[#98143F] to-[#71102F] text-white shadow-xs"
                            : "border-[#EDE4E8] bg-white text-transparent hover:border-[#98143F]/40",
                        )}
                      >
                        {on ? "✓" : ""}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-[#EDE4E8] bg-[#FAF7F8]/80 p-3.5 text-xs text-[#6E686F]">
        Permissions configured here govern menu availability and actionable controls. The backend enforces these identical security checks on every protected endpoint.
      </p>
    </Card>
  );
}
