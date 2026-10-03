"use client";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, CheckCircle2, ClipboardList, Pencil, Play, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Button, IconButton } from "@/components/ui/button";
import { Card, Progress, StatusBadge } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/feedback";
import { Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/overlay";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useCreate, useList, useRemove, useUpdate } from "@/hooks/useResource";
import { fmtDate } from "@/lib/format";
import type { Role, Task } from "@/services/types";
import { FormDialog } from "./form-dialog";
import { useScope } from "./scope";

const schema = z.object({ clientId: z.string().min(1, "Choose a client"), title: z.string().min(3, "Add a title"), description: z.string().min(5, "Describe the task"), due: z.string().min(1, "Pick a due date") });
const isOverdue = (t: Task) => t.status !== "completed" && new Date(t.due) < new Date(new Date().toDateString());
const eff = (t: Task) => (isOverdue(t) ? "overdue" : t.status);

export function TasksView({ role, clientId }: { role: Role; clientId?: string }) {
  const scope = useScope(role);
  const params = { ...scope, ...(clientId ? { clientId } : {}) };
  const q = useList("tasks", params);
  const clients = useList("clients", scope, role === "therapist");
  const create = useCreate("tasks"), update = useUpdate("tasks"), remove = useRemove("tasks");
  const [tab, setTab] = useState("open"), [search, setSearch] = useState("");
  const [form, setForm] = useState<Task | "new" | null>(null);
  const [done, setDone] = useState<Task | null>(null);
  const [response, setResponse] = useState("");
  const { toast } = useToast(), confirm = useConfirm();
  const therapist = role === "therapist";

  const rows = useMemo(() => (q.data ?? []).filter((t) => (tab === "all" ? true : tab === "open" ? t.status !== "completed" : t.status === "completed") && `${t.title} ${t.clientName}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.due.localeCompare(b.due)), [q.data, tab, search]);
  const total = q.data?.length ?? 0, completed = q.data?.filter((t) => t.status === "completed").length ?? 0;

  const setStatus = (t: Task, status: Task["status"], extra?: Partial<Task>) => update.mutateAsync({ id: t.id, status, ...extra }).then(() => toast(status === "completed" ? "Task completed — well done!" : "Task updated")).catch(() => toast("Could not update task", "error"));

  return (
    <>
      <PageHeader eyebrow="Care plan" title={therapist ? "Task Assignment" : "My Tasks"} subtitle={therapist ? "Assign between-session exercises and track completion." : "Complete the exercises assigned by your therapist."} actions={therapist && <Button icon={<Plus className="size-3.5" />} onClick={() => setForm("new")}>Assign task</Button>} />
      <Card hover={false} className="mb-4 p-4"><div className="mb-2 flex justify-between text-xs font-bold"><span>Completion</span><span>{completed}/{total}</span></div><Progress value={total ? (completed / total) * 100 : 0} /></Card>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tabs value={tab} onChange={setTab} items={[{ id: "open", label: "Open", count: total - completed }, { id: "completed", label: "Completed", count: completed }, { id: "all", label: "All" }]} />
        <label className="relative ml-auto w-full sm:w-64"><Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" /><input aria-label="Search tasks" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…" className="w-full rounded-[10px] border border-line bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-wine" /></label>
      </div>
      {q.isLoading ? <CardSkeleton rows={4} /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : rows.length === 0 ? (
        <EmptyState icon={<ClipboardList className="size-6" />} title={search ? "No tasks match" : tab === "completed" ? "Nothing completed yet" : "No open tasks"} description={therapist ? "Assign a task to give your client something to practise." : "Your therapist will assign tasks after sessions."} action={therapist && <Button onClick={() => setForm("new")}>Assign task</Button>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2"><AnimatePresence initial={false}>
          {rows.map((t) => (
            <motion.div key={t.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
              <Card className="h-full p-4">
                <div className="flex items-start justify-between gap-2"><div><div className="text-sm font-extrabold">{t.title}</div>{therapist && <div className="text-[11px] text-muted">For {t.clientName}</div>}</div><StatusBadge status={eff(t)} /></div>
                <p className="mt-2 text-xs text-muted">{t.description}</p>
                {t.response && <div className="mt-2 rounded-lg bg-[#f6fbf8] p-2 text-[11px]"><b>Response:</b> {t.response}</div>}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1 text-[11px] text-muted"><CalendarClock className="size-3" />Due {fmtDate(t.due)}</span>
                  <div className="flex items-center gap-1.5">
                    {!therapist && t.status !== "completed" && <>{t.status === "assigned" && <Button size="sm" variant="outline" icon={<Play className="size-3" />} onClick={() => setStatus(t, "in_progress")}>Start</Button>}<Button size="sm" icon={<CheckCircle2 className="size-3" />} onClick={() => { setResponse(""); setDone(t); }}>Complete</Button></>}
                    {therapist && <><IconButton label="Edit task" onClick={() => setForm(t)}><Pencil className="size-3.5" /></IconButton><IconButton label="Delete task" onClick={async () => { if (await confirm({ title: "Delete this task?", description: "The client will no longer see it.", confirmLabel: "Delete", danger: true })) remove.mutate(t.id, { onSuccess: () => toast("Task deleted", "info") }); }}><Trash2 className="size-3.5" /></IconButton></>}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence></div>
      )}
      <FormDialog<Task> open={!!form} onClose={() => setForm(null)} title={form === "new" ? "Assign task" : "Edit task"} submitLabel={form === "new" ? "Assign" : "Save"} schema={schema} successMessage={form === "new" ? "Task assigned" : "Task updated"}
        fields={[{ name: "clientId", label: "Client", type: "select", options: (clients.data ?? []).map((c) => ({ value: c.id, label: c.name })), span: 2 }, { name: "title", label: "Title", span: 2 }, { name: "description", label: "Instructions", type: "textarea" }, { name: "due", label: "Due date", type: "date" }]}
        defaultValues={(form && form !== "new" ? form : { clientId: clientId ?? "", title: "", description: "", due: "" }) as never}
        onSubmit={(v) => { const c = clients.data?.find((x) => x.id === v.clientId); return form === "new" ? create.mutateAsync({ ...v, clientName: c?.name ?? "", therapistId: scope.therapistId, status: "assigned" } as Partial<Task>) : update.mutateAsync({ ...v, id: (form as Task).id, clientName: c?.name ?? (form as Task).clientName }); }} />
      <Modal open={!!done} onClose={() => setDone(null)} title="Complete task" description={done?.title} footer={<><Button variant="outline" onClick={() => setDone(null)}>Cancel</Button><Button loading={update.isPending} onClick={async () => { await setStatus(done!, "completed", { response: response.trim() || undefined }); setDone(null); }}>Mark complete</Button></>}>
        <Textarea label="How did it go? (optional)" value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Share notes with your therapist…" />
      </Modal>
    </>
  );
}