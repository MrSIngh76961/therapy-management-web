"use client";
import { motion } from "framer-motion";
import { CalendarPlus, HeartHandshake, Plus, Star, UserMinus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Avatar, Card, KV, SectionCard, StatusBadge } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { CardSkeleton, EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useAction, useItem, useList, useUpdate } from "@/hooks/useResource";
import { fmtDate } from "@/lib/format";
import { api } from "@/services/api";
import { AppointmentsView } from "@/features/shared/appointments";
import { DocumentsView } from "@/features/shared/documents";
import { FormDialog } from "@/features/shared/form-dialog";
import { SessionsView } from "@/features/shared/sessions";
import { TasksView } from "@/features/shared/tasks";

const schema = z.object({ code: z.string().min(3, "Enter the therapist's email or code") });

export function TherapistsPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false), [tab, setTab] = useState("all");
  const q = useList("therapist-links", { clientId: user?.id });
  const add = useAction((code: string) => api.post("/therapist-links", { code, clientId: user?.id }), ["therapist-links"]);
  const update = useUpdate("therapist-links");
  const { toast } = useToast(), confirm = useConfirm();
  const rows = (q.data ?? []).filter((l) => tab === "all" || l.status === tab);
  return (
    <>
      <PageHeader eyebrow="Care team" title="My Therapists" subtitle="Add a therapist with their email or TheraFlow code." actions={<Button icon={<Plus className="size-3.5" />} onClick={() => setOpen(true)}>Add therapist</Button>} />
      <Tabs className="mb-4 w-fit" value={tab} onChange={setTab} items={[{ id: "all", label: "All" }, { id: "newly_added", label: "Newly added" }, { id: "active", label: "Active" }, { id: "ended", label: "Ended" }]} />
      {q.isLoading ? <CardSkeleton rows={3} /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : rows.length === 0 ? <EmptyState icon={<HeartHandshake className="size-6" />} title="No therapists here" description="Connect with your therapist using their email or code (try aisha.sharma@theraflow.in)." action={<Button onClick={() => setOpen(true)}>Add therapist</Button>} /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((l, i) => (
          <motion.div key={l.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="h-full p-4"><div className="flex items-start gap-3"><Avatar name={l.therapistName} size={44} /><div className="min-w-0 flex-1"><div className="truncate text-sm font-extrabold">{l.therapistName}</div><div className="text-[11px] text-muted">{l.specialization}</div></div><StatusBadge status={l.status} /></div>
              <div className="mt-3 text-[11px] text-muted">Connected {fmtDate(l.since)}</div>
              <div className="mt-3 flex flex-wrap gap-2"><Link href={`/client/therapists/${l.therapistId}`}><Button size="sm" variant="outline">View</Button></Link>
                {l.status === "newly_added" && <Button size="sm" icon={<CalendarPlus className="size-3" />} onClick={async () => { await update.mutateAsync({ id: l.id, status: "active" }); toast(`${l.therapistName} is now your active therapist`); }}>Start working together</Button>}
                {l.status !== "ended" && <Button size="sm" variant="ghost" icon={<UserMinus className="size-3" />} onClick={async () => { if (await confirm({ title: `End care with ${l.therapistName}?`, description: "You can add them again later. Past sessions and records are kept.", confirmLabel: "End", danger: true })) { await update.mutateAsync({ id: l.id, status: "ended" }); toast("Connection ended", "info"); } }}>End</Button>}</div></Card>
          </motion.div>))}</div>
      )}
      <FormDialog<{ code: string }> open={open} onClose={() => setOpen(false)} title="Add a therapist" description="Ask your therapist for their email or TheraFlow code." submitLabel="Connect" schema={schema} successMessage="Therapist added" fields={[{ name: "code", label: "Therapist email or code", placeholder: "name@clinic.com or TF-t1" }]} defaultValues={{ code: "" }} onSubmit={(v) => add.mutateAsync(v.code)} />
    </>
  );
}

export function TherapistDashboard() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const t = useItem("therapists", id);
  const links = useList("therapist-links", { clientId: user?.id });
  const link = links.data?.find((l) => l.therapistId === id);
  const upcoming = useList("appointments", { clientId: user?.id, therapistId: id, scope: "upcoming", sort: "start", dir: "asc" });
  if (t.isError) return <><PageHeader back={{ href: "/client/therapists", label: "My Therapists" }} title="Therapist" /><ErrorState message="Therapist not found." onRetry={() => t.refetch()} /></>;
  const d = t.data;
  if (!d) return <div className="space-y-4"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-44" /></div>;
  return (
    <>
      <PageHeader back={{ href: "/client/therapists", label: "My Therapists" }} eyebrow="Therapist dashboard" title={d.name} subtitle={`${d.specialization} · ${d.experience} yrs experience`} actions={<>{link && <StatusBadge status={link.status} />}<Button icon={<CalendarPlus className="size-3.5" />} onClick={() => router.push("/client/appointments?new=1")}>Book session</Button></>} />
      <Tabs className="mb-4" value={tab} onChange={setTab} items={["overview", "sessions", "appointments", "tasks", "documents"].map((x) => ({ id: x, label: x[0].toUpperCase() + x.slice(1) }))} />
      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <SectionCard title="About">
            <p className="text-xs leading-relaxed text-muted">{d.bio ?? "Your therapist has not added a bio yet."}</p>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4"><KV label="Languages">{d.languages ?? "—"}</KV><KV label="Fee">₹{d.fee}</KV><KV label="Rating"><span className="inline-flex items-center gap-1"><Star className="size-3 fill-[#f5a623] text-[#f5a623]" />{d.rating || "New"}</span></KV><KV label="License">{d.license || "—"}</KV></div>
          </SectionCard>
          <SectionCard title="Upcoming with this therapist">{upcoming.isLoading ? <Skeleton className="h-16" /> : upcoming.data?.length ? <div className="space-y-2">{upcoming.data.slice(0, 3).map((a) => <Card key={a.id} className="flex items-center justify-between p-3 text-xs"><b>{fmtDate(a.start)}</b><StatusBadge status={a.status} /></Card>)}</div> : <p className="text-xs text-muted">Nothing scheduled yet.</p>}</SectionCard>
        </div>
      )}
      {tab === "sessions" && <SessionsView role="client" therapistId={id} embedded />}
      {tab === "appointments" && <AppointmentsView role="client" />}
      {tab === "tasks" && <TasksView role="client" />}
      {tab === "documents" && <DocumentsView role="client" />}
    </>
  );
}