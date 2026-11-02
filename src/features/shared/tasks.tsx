"use client";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CalendarClock, CheckCircle2, ClipboardList, Clock, Pencil, Play, Plus, Search, Sparkles, Trash2, User } from "lucide-react";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Button, IconButton } from "@/components/ui/button";
import { Avatar, Card, Progress, StatusBadge } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/feedback";
import { Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/overlay";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useCreate, useList, useRemove, useUpdate } from "@/hooks/useResource";
import { cn } from "@/lib/cn";
import { fmtDate } from "@/lib/format";
import type { Role, Task } from "@/services/types";
import { FormDialog } from "./form-dialog";
import { useScope } from "./scope";

const schema = z.object({
  clientId: z.string().min(1, "Choose a client"),
  title: z.string().min(3, "Add a title"),
  description: z.string().min(5, "Describe the task"),
  due: z.string().min(1, "Pick a due date"),
});

const isOverdue = (t: Task) => t.status !== "completed" && new Date(t.due) < new Date(new Date().toDateString());
const eff = (t: Task) => (isOverdue(t) ? "overdue" : t.status);

export function TasksView({ role, clientId }: { role: Role; clientId?: string }) {
  const scope = useScope(role);
  const params = { ...scope, ...(clientId ? { clientId } : {}) };
  const q = useList("tasks", params);
  const clients = useList("clients", scope, role === "therapist");
  const create = useCreate("tasks");
  const update = useUpdate("tasks");
  const remove = useRemove("tasks");
  const [tab, setTab] = useState("open");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<Task | "new" | null>(null);
  const [done, setDone] = useState<Task | null>(null);
  const [response, setResponse] = useState("");
  const { toast } = useToast();
  const confirm = useConfirm();
  const therapist = role === "therapist";

  const rows = useMemo(
    () =>
      (q.data ?? [])
        .filter(
          (t) =>
            (tab === "all" ? true : tab === "open" ? t.status !== "completed" : t.status === "completed") &&
            `${t.title} ${t.clientName}`.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => a.due.localeCompare(b.due)),
    [q.data, tab, search]
  );

  const total = q.data?.length ?? 0;
  const completed = q.data?.filter((t) => t.status === "completed").length ?? 0;
  const overdueCount = q.data?.filter((t) => isOverdue(t)).length ?? 0;
  const inProgressCount = q.data?.filter((t) => t.status === "in_progress").length ?? 0;
  const completionPct = total ? Math.round((completed / total) * 100) : 0;

  const setStatus = (t: Task, status: Task["status"], extra?: Partial<Task>) =>
    update
      .mutateAsync({ id: t.id, status, ...extra })
      .then(() => toast(status === "completed" ? "Task completed — great work!" : "Task updated"))
      .catch(() => toast("Could not update task", "error"));

  return (
    <>
      <PageHeader
        eyebrow="Care Continuum"
        title={therapist ? "Therapeutic Assignments" : "My Care Plan & Exercises"}
        subtitle={
          therapist
            ? "Prescribe between-session exercises, track client compliance, and review reflections."
            : "Engage with homework assignments, journaling exercises and coping strategies between sessions."
        }
        actions={
          therapist && (
            <Button icon={<Plus className="size-3.5" />} onClick={() => setForm("new")}>
              Assign Exercise
            </Button>
          )
        }
      />

      {/* Progress & stats hero card */}
      <Card hover={false} className="mb-5 overflow-hidden p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-wine to-[#d15d7d] text-white shadow-sm">
              <Sparkles className="size-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted">
                {therapist ? "Caseload Progress" : "Care Progress"}
              </div>
              <div className="text-lg font-extrabold text-ink">
                {completed} of {total} Exercises Completed ({completionPct}%)
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3 py-1 text-xs font-bold text-ok">
              <CheckCircle2 className="size-3.5" />
              {completed} Done
            </span>
            {inProgressCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-soft-blue px-3 py-1 text-xs font-bold text-info">
                <Clock className="size-3.5" />
                {inProgressCount} In Progress
              </span>
            )}
            {overdueCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-coral px-3 py-1 text-xs font-bold text-bad">
                <AlertCircle className="size-3.5" />
                {overdueCount} Overdue
              </span>
            )}
          </div>
        </div>
        <div className="mt-4">
          <Progress value={completionPct} />
        </div>
      </Card>

      {/* Controls: tabs & search */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: "open", label: "Open Exercises", count: total - completed },
            { id: "completed", label: "Completed", count: completed },
            { id: "all", label: "All Exercises" },
          ]}
        />
        <label className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            aria-label="Search tasks"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercises by title or client…"
            className="w-full rounded-xl border border-line bg-white py-2.5 pl-10 pr-3 text-xs outline-none focus:border-wine focus:ring-2 focus:ring-wine/10"
          />
        </label>
      </div>

      {q.isLoading ? (
        <CardSkeleton rows={4} />
      ) : q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-7 text-wine" />}
          title={search ? "No exercises match your query" : tab === "completed" ? "No completed exercises yet" : "No open exercises"}
          description={
            therapist
              ? "Assign a between-session exercise or self-reflection activity to support your client's growth."
              : "Your therapist will assign personalized homework exercises after your consultation sessions."
          }
          action={
            therapist && (
              <Button onClick={() => setForm("new")} icon={<Plus className="size-3.5" />}>
                Assign Exercise
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <AnimatePresence initial={false}>
            {rows.map((t) => {
              const statusVariant = t.status === "completed" ? "mint" : isOverdue(t) ? "coral" : "default";
              return (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                >
                  <Card variant={statusVariant} className="flex h-full flex-col justify-between p-5">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-extrabold text-ink">{t.title}</h3>
                          {therapist && (
                            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
                              <User className="size-3 text-wine" />
                              <span className="font-semibold text-ink/80">{t.clientName}</span>
                            </div>
                          )}
                        </div>
                        <StatusBadge status={eff(t)} />
                      </div>

                      <p className="mt-2.5 text-xs leading-relaxed text-ink/75">{t.description}</p>

                      {t.response && (
                        <div className="mt-3 rounded-xl border border-ok/20 bg-mint/65 p-3 text-xs">
                          <div className="mb-1 flex items-center gap-1 font-bold text-ok">
                            <CheckCircle2 className="size-3.5" />
                            Client Reflection
                          </div>
                          <p className="text-ink/80 text-[11px] leading-relaxed italic">{t.response}</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-[11px] font-semibold",
                          isOverdue(t) ? "text-bad font-bold" : "text-muted"
                        )}
                      >
                        <CalendarClock className="size-3.5" />
                        Due {fmtDate(t.due)}
                        {isOverdue(t) && " (Overdue)"}
                      </span>

                      <div className="flex items-center gap-2">
                        {!therapist && t.status !== "completed" && (
                          <>
                            {t.status === "assigned" && (
                              <Button
                                size="sm"
                                variant="outline"
                                icon={<Play className="size-3" />}
                                onClick={() => setStatus(t, "in_progress")}
                              >
                                Start
                              </Button>
                            )}
                            <Button
                              size="sm"
                              icon={<CheckCircle2 className="size-3.5" />}
                              onClick={() => {
                                setResponse("");
                                setDone(t);
                              }}
                            >
                              Complete
                            </Button>
                          </>
                        )}
                        {therapist && (
                          <>
                            <IconButton label="Edit exercise" onClick={() => setForm(t)}>
                              <Pencil className="size-3.5" />
                            </IconButton>
                            <IconButton
                              label="Delete exercise"
                              onClick={async () => {
                                if (
                                  await confirm({
                                    title: "Delete this exercise?",
                                    description: "The client will no longer see this task on their care dashboard.",
                                    confirmLabel: "Delete Exercise",
                                    danger: true,
                                  })
                                )
                                  remove.mutate(t.id, {
                                    onSuccess: () => toast("Exercise removed", "info"),
                                  });
                              }}
                            >
                              <Trash2 className="size-3.5" />
                            </IconButton>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <FormDialog<Task>
        open={!!form}
        onClose={() => setForm(null)}
        title={form === "new" ? "Assign Therapeutic Exercise" : "Edit Exercise"}
        description={
          form === "new"
            ? "Create a targeted homework task or reflection exercise for your client."
            : undefined
        }
        submitLabel={form === "new" ? "Assign Exercise" : "Save Changes"}
        schema={schema}
        successMessage={form === "new" ? "Exercise assigned successfully" : "Exercise updated"}
        fields={[
          {
            name: "clientId",
            label: "Client",
            type: "select",
            options: (clients.data ?? []).map((c) => ({ value: c.id, label: c.name })),
            span: 2,
          },
          { name: "title", label: "Exercise Title", span: 2 },
          { name: "description", label: "Instructions & Guidance", type: "textarea" },
          { name: "due", label: "Target Completion Date", type: "date" },
        ]}
        defaultValues={
          (form && form !== "new"
            ? form
            : { clientId: clientId ?? "", title: "", description: "", due: "" }) as never
        }
        onSubmit={(v) => {
          const c = clients.data?.find((x) => x.id === v.clientId);
          return form === "new"
            ? create.mutateAsync({
              ...v,
              clientName: c?.name ?? "",
              therapistId: scope.therapistId,
              status: "assigned",
            } as Partial<Task>)
            : update.mutateAsync({
              ...v,
              id: (form as Task).id,
              clientName: c?.name ?? (form as Task).clientName,
            });
        }}
      />

      <Modal
        open={!!done}
        onClose={() => setDone(null)}
        title="Complete Exercise"
        description={done?.title}
        footer={
          <>
            <Button variant="outline" onClick={() => setDone(null)}>
              Cancel
            </Button>
            <Button
              loading={update.isPending}
              onClick={async () => {
                await setStatus(done!, "completed", { response: response.trim() || undefined });
                setDone(null);
              }}
            >
              Mark Complete
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-muted">
            Share how you felt, what insights you discovered, or questions you would like to discuss in your next consultation.
          </p>
          <Textarea
            label="Reflection & Notes (optional)"
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="e.g., Practiced the 4-7-8 breathing technique twice daily. Felt calmer in the evenings…"
            rows={4}
          />
        </div>
      </Modal>
    </>
  );
}
