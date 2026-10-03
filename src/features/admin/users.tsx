"use client";
import { Lock, Pencil, Plus, Power, Save } from "lucide-react";
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
const schema = z.object({ name: z.string().min(3, "Enter full name"), email: z.string().email("Enter a valid email"), role: z.string().min(1, "Select a role"), status: z.enum(["active", "pending", "inactive"]) });
const actions = ["view", "create", "edit", "delete"];

export function UsersPage() {
  const [tab, setTab] = useState("users");
  const [edit, setEdit] = useState<ClinicUser | "new" | null>(null);
  const create = useCreate("users"), update = useUpdate("users");
  const confirm = useConfirm(), { toast } = useToast();
  const toggle = async (u: ClinicUser) => {
    const next = u.status === "inactive" ? "active" : "inactive";
    if (u.role === "Owner") return toast("The clinic owner cannot be deactivated", "error");
    if (!(await confirm({ title: `${next === "inactive" ? "Deactivate" : "Activate"} ${u.name}?`, description: next === "inactive" ? "They will be signed out and lose access immediately." : "They will regain access with their current role.", confirmLabel: next === "inactive" ? "Deactivate" : "Activate", danger: next === "inactive" }))) return;
    try { await update.mutateAsync({ id: u.id, status: next }); toast(`${u.name} ${next === "inactive" ? "deactivated" : "activated"}`); } catch { toast("Could not update user", "error"); }
  };
  return (
    <>
      <PageHeader eyebrow="Administration" title="Users & Permissions" subtitle="Control who can access which parts of the clinic workspace." actions={tab === "users" ? <Button icon={<Plus className="size-3.5" />} onClick={() => setEdit("new")}>Invite user</Button> : undefined} />
      <Tabs className="mb-4 w-fit" value={tab} onChange={setTab} items={[{ id: "users", label: "Users" }, { id: "roles", label: "Role permissions" }]} />
      {tab === "users" ? (
        <DataTable resource="users" searchPlaceholder="Search users…" defaultSort={{ key: "name", dir: "asc" }} onRowClick={setEdit}
          filters={[{ key: "role", label: "Role", options: roles.map((r) => ({ value: r, label: r })) }, { key: "status", label: "Status", options: ["active", "pending", "inactive"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })) }]}
          rowActions={(u) => [{ label: "Edit", icon: <Pencil className="size-3.5" />, onSelect: () => setEdit(u) }, { label: u.status === "inactive" ? "Activate" : "Deactivate", icon: <Power className="size-3.5" />, onSelect: () => toggle(u), danger: u.status !== "inactive" }]}
          emptyTitle="No users" emptyDescription="Invite staff to collaborate." emptyAction={<Button onClick={() => setEdit("new")}>Invite user</Button>}
          columns={[
            { key: "name", header: "User", sortable: true, render: (u: ClinicUser) => <div className="flex items-center gap-2.5"><Avatar name={u.name} size={32} /><div><div className="font-bold">{u.name}</div><div className="text-[10px] text-muted">{u.email}</div></div></div> },
            { key: "role", header: "Role", sortable: true }, { key: "lastLogin", header: "Last login", sortable: true, hideBelow: "md", render: (u: ClinicUser) => fmtDate(u.lastLogin) },
            { key: "status", header: "Status", sortable: true, render: (u: ClinicUser) => <StatusBadge status={u.status} /> },
          ]} />
      ) : <PermissionMatrixCard />}
      <FormDialog<ClinicUser> open={!!edit} onClose={() => setEdit(null)} title={edit === "new" ? "Invite user" : "Edit user"} description={edit === "new" ? "An invitation email is sent with a secure setup link." : undefined} submitLabel={edit === "new" ? "Send invite" : "Save"}
        fields={[{ name: "name", label: "Full name", span: 2 }, { name: "email", label: "Email", type: "email" }, { name: "role", label: "Role", type: "select", options: roles.map((r) => ({ value: r, label: r })) }, { name: "status", label: "Status", type: "select", options: ["active", "pending", "inactive"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })) }]}
        schema={schema} defaultValues={(edit && edit !== "new" ? edit : { name: "", email: "", role: "Front Desk", status: "pending" }) as never} successMessage={edit === "new" ? "Invitation sent" : "User updated"}
        onSubmit={(v) => (edit === "new" ? create.mutateAsync({ ...v, lastLogin: new Date().toISOString() }) : update.mutateAsync({ ...v, id: (edit as ClinicUser).id }))} />
    </>
  );
}

function PermissionMatrixCard() {
  const q = useApiQuery<PermissionMatrix>(["settings", "permissions"], "/settings/permissions");
  const [draft, setDraft] = useState<PermissionMatrix | null>(null);
  const [role, setRole] = useState("Admin");
  const { toast } = useToast();
  const save = useAction((m: PermissionMatrix) => api.put("/settings/permissions", m), ["settings"]);
  useEffect(() => { if (q.data) setDraft(q.data); }, [q.data]);
  if (q.isLoading || !draft) return <CardSkeleton rows={5} />;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  const dirty = JSON.stringify(draft) !== JSON.stringify(q.data);
  const locked = role === "Owner";
  const flip = (m: string, a: string) => setDraft((d) => { const cur = d![role][m]; const next = cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]; return { ...d!, [role]: { ...d![role], [m]: next } }; });
  return (
    <Card hover={false} className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-3">
        <Tabs value={role} onChange={setRole} items={roles.map((r) => ({ id: r, label: r }))} />
        <div className="flex items-center gap-2">{locked && <span className="flex items-center gap-1 text-[11px] text-muted"><Lock className="size-3" />Owner has full access</span>}<Button icon={<Save className="size-3.5" />} disabled={!dirty} loading={save.isPending} onClick={async () => { try { await save.mutateAsync(draft); toast("Permissions saved"); } catch { toast("Could not save permissions", "error"); } }}>Save changes</Button></div>
      </div>
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full text-xs"><thead><tr>{["Module", ...actions].map((h) => <th key={h} className="border-b border-line p-3 text-left text-[9px] font-bold uppercase tracking-wider text-[#999]">{h}</th>)}</tr></thead>
          <tbody>{Object.keys(draft[role]).map((m) => (
            <tr key={m} className="hover:bg-[#fff8fa]"><td className="border-b border-[#f0ecec] p-3 font-bold">{m}</td>
              {actions.map((a) => { const on = draft[role][m].includes(a); return <td key={a} className="border-b border-[#f0ecec] p-3"><button disabled={locked} role="checkbox" aria-checked={on} aria-label={`${role} can ${a} ${m}`} onClick={() => flip(m, a)} className={cn("grid size-5 place-items-center rounded-md border text-[10px] font-extrabold transition-all disabled:opacity-60", on ? "border-wine bg-wine text-white" : "border-line bg-white hover:border-[#c78398]")}>{on ? "✓" : ""}</button></td>; })}
            </tr>))}</tbody></table>
      </div>
      <p className="border-t border-line p-3 text-[10px] text-muted">Permissions shown here control the interface. The backend must enforce the same rules on every API request.</p>
    </Card>
  );
}