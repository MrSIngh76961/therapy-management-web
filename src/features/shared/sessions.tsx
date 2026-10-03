"use client";
import { Check, FileText, Lock, MessageSquarePlus, Mic, Share2, Video } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, Card, KV, SectionCard, StatusBadge } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Select, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useAction, useItem, useList } from "@/hooks/useResource";
import { cn } from "@/lib/cn";
import { fmtBytes, fmtDate, fmtDateTime } from "@/lib/format";
import { api } from "@/services/api";
import type { Appointment, Role } from "@/services/types";
import { modeLabel, sessionStatusOptions } from "./labels";
import { useScope } from "./scope";

export function SessionsView({ role, clientId, therapistId, embedded }: { role: Role; clientId?: string; therapistId?: string; embedded?: boolean }) {
  const scope = useScope(role);
  const router = useRouter();
  const base = { ...scope, ...(clientId ? { clientId } : {}), ...(therapistId ? { therapistId } : {}), scope: "past" };
  return (
    <>
      {!embedded && <PageHeader eyebrow="History" title="Sessions" subtitle={role === "client" ? "Notes, shared comments and transcripts from your past sessions." : "Past sessions with summaries, transcripts and post-session comments."} />}
      <DataTable resource="appointments" baseParams={base} searchPlaceholder="Search sessions…" defaultSort={{ key: "start", dir: "desc" }} onRowClick={(a) => router.push(`/${role}/sessions/${a.id}`)}
        filters={[{ key: "status", label: "Status", options: sessionStatusOptions.filter((o) => ["completed", "cancelled", "no_show"].includes(o.value)) }, { key: "mode", label: "Mode", options: [{ value: "video", label: "Video" }, { value: "audio", label: "Audio" }, { value: "in_person", label: "In person" }] }]}
        emptyTitle="No past sessions" emptyDescription="Completed sessions will appear here."
        columns={[
          { key: "start", header: "Date", sortable: true, render: (a: Appointment) => fmtDateTime(a.start) },
          ...(role === "therapist" && !clientId ? [{ key: "clientName", header: "Client", sortable: true }] : []),
          ...(role === "client" && !therapistId ? [{ key: "therapistName", header: "Therapist", sortable: true }] : []),
          { key: "serviceName", header: "Service", hideBelow: "md" as const },
          { key: "mode", header: "Mode", hideBelow: "sm" as const, render: (a: Appointment) => modeLabel[a.mode] },
          { key: "summary", header: "Notes", hideBelow: "lg" as const, render: (a: Appointment) => (a.summary ? <Check className="size-4 text-ok" aria-label="Has summary" /> : <span className="text-muted">—</span>) },
          { key: "status", header: "Status", sortable: true, render: (a: Appointment) => <StatusBadge status={a.status} /> },
        ]} />
    </>
  );
}

export function SessionDetail({ role }: { role: Role }) {
  const { id } = useParams<{ id: string }>();
  const q = useItem("appointments", id);
  const [tab, setTab] = useState("summary");
  const [text, setText] = useState(""), [vis, setVis] = useState<"private" | "shared">("shared");
  const [summary, setSummary] = useState<string | null>(null);
  const { toast } = useToast();
  const scope = useScope(role);
  const tasks = useList("tasks", { ...scope, sessionId: id });
  const docs = useList("documents", { ...scope, sessionId: id });
  const fb = useList("feedback", { ...scope, sessionId: id });
  const addComment = useAction((b: { text: string; visibility: string }) => api.post(`/appointments/${id}/comments`, b), ["appointments"]);
  const saveSummary = useAction((s: string) => api.patch(`/appointments/${id}`, { summary: s }), ["appointments"]);
  const share = useAction(() => api.post<{ url: string }>(`/appointments/${id}/share-link`), ["appointments"]);
  const a = q.data;
  const therapist = role === "therapist";
  const back = `/${role}/sessions`;

  if (q.isError) return <><PageHeader back={{ href: back, label: "Sessions" }} title="Session" /><ErrorState message="This session could not be found or loaded." onRetry={() => q.refetch()} /></>;
  if (!a) return <div className="space-y-4"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-40" /></div>;
  const comments = (a.comments ?? []).filter((c) => therapist || c.visibility === "shared");
  const upcoming = ["scheduled", "link_shared", "joined", "live"].includes(a.status);

  return (
    <>
      <PageHeader back={{ href: back, label: "Sessions" }} eyebrow={a.serviceName} title={fmtDateTime(a.start)} subtitle={`${therapist ? a.clientName : a.therapistName} · ${a.duration} min · ${modeLabel[a.mode]}`}
        actions={<><StatusBadge status={a.status} />
          {therapist && ["scheduled", "link_shared"].includes(a.status) && <Button variant="outline" size="sm" icon={<Share2 className="size-3.5" />} loading={share.isPending} onClick={async () => { const r = await share.mutateAsync(); await navigator.clipboard?.writeText(`${location.origin}${r.url}`).catch(() => {}); toast("Secure session link copied"); }}>Share link</Button>}
          {upcoming && role !== "admin" && <Link href={`/${role}/session/${a.id}`}><Button size="sm" icon={a.mode === "audio" ? <Mic className="size-3.5" /> : <Video className="size-3.5" />}>{a.status === "live" ? "Rejoin" : "Take session"}</Button></Link>}</>} />
      <Tabs className="mb-4 w-fit" value={tab} onChange={setTab} items={[{ id: "summary", label: "Summary" }, { id: "transcript", label: "Transcript", count: a.transcript?.length }, { id: "comments", label: "Comments", count: comments.length }, { id: "tasks", label: "Tasks", count: tasks.data?.length }, { id: "docs", label: "Documents", count: docs.data?.length }, { id: "feedback", label: "Feedback" }]} />
      {tab === "summary" && (
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <SectionCard title="Session summary">
            {therapist && a.status !== "cancelled" ? (
              <div className="space-y-2"><Textarea label="Clinical summary (visible to you; shown to client when shared)" value={summary ?? a.summary ?? ""} onChange={(e) => setSummary(e.target.value)} placeholder="Key themes, interventions, next steps…" />
                <Button size="sm" disabled={summary === null || summary === (a.summary ?? "")} loading={saveSummary.isPending} onClick={async () => { await saveSummary.mutateAsync(summary!); setSummary(null); toast("Summary saved"); }}>Save summary</Button></div>
            ) : a.summary ? <p className="text-xs leading-relaxed">{a.summary}</p> : <EmptyState icon={<FileText className="size-6" />} title="No summary yet" description="A summary appears once your therapist adds one." />}
          </SectionCard>
          <SectionCard title="Details"><div className="grid grid-cols-2 gap-4"><KV label="Therapist">{a.therapistName}</KV><KV label="Client">{a.clientName}</KV><KV label="Fee">₹{a.fee}</KV><KV label="Payment"><StatusBadge status={a.paymentStatus} /></KV></div></SectionCard>
        </div>
      )}
      {tab === "transcript" && <SectionCard title="Transcript">{a.transcript?.length ? <ul className="space-y-3">{a.transcript.map((l) => <li key={l.id} className="flex gap-3"><Avatar name={l.speaker === "therapist" ? a.therapistName : a.clientName} size={28} /><div><div className="text-[10px] font-bold text-muted">{l.speaker === "therapist" ? a.therapistName : a.clientName} · {l.at}</div><p className="text-xs">{l.text}</p></div></li>)}</ul> : <EmptyState title="No transcript" description="Transcripts are captured only when live transcription is enabled with consent." />}</SectionCard>}
      {tab === "comments" && (
        <div className="space-y-4">
          {therapist && <SectionCard title="Post-session comment"><div className="space-y-3"><Textarea label="Comment" value={text} onChange={(e) => setText(e.target.value)} placeholder="Observations, homework rationale, follow-up…" />
            <div className="flex flex-wrap items-end gap-3"><div className="w-48"><Select label="Visibility" value={vis} onChange={(e) => setVis(e.target.value as "private" | "shared")} options={[{ value: "shared", label: "Shared with client" }, { value: "private", label: "Private note" }]} /></div>
              <Button icon={<MessageSquarePlus className="size-3.5" />} disabled={text.trim().length < 3} loading={addComment.isPending} onClick={async () => { await addComment.mutateAsync({ text: text.trim(), visibility: vis }); setText(""); toast("Comment added"); }}>Add comment</Button></div></div></SectionCard>}
          {comments.length === 0 ? <EmptyState title="No comments" description={therapist ? "Add post-session notes above." : "Your therapist hasn't shared comments for this session."} /> : comments.map((c) => (
            <Card key={c.id} hover={false} className="p-3.5"><div className="mb-1 flex items-center justify-between text-[10px] text-muted"><span>{fmtDateTime(c.at)}</span><span className={cn("flex items-center gap-1 font-bold", c.visibility === "private" ? "text-warn" : "text-ok")}>{c.visibility === "private" && <Lock className="size-3" />}{c.visibility === "private" ? "Private" : "Shared"}</span></div><p className="text-xs">{c.text}</p></Card>))}
        </div>
      )}
      {tab === "tasks" && (tasks.data?.length ? <div className="space-y-2">{tasks.data.map((t) => <Card key={t.id} hover={false} className="flex items-center justify-between p-3.5 text-xs"><div><b>{t.title}</b><div className="text-[10px] text-muted">Due {fmtDate(t.due)}</div></div><StatusBadge status={t.status} /></Card>)}</div> : <EmptyState title="No tasks linked" description="Tasks assigned from this session show here." />)}
      {tab === "docs" && (docs.data?.length ? <div className="space-y-2">{docs.data.map((d) => <Card key={d.id} hover={false} className="flex items-center justify-between p-3.5 text-xs"><b>{d.name}</b><span className="text-muted">{fmtBytes(d.size)}</span></Card>)}</div> : <EmptyState title="No documents linked" />)}
      {tab === "feedback" && (fb.data?.length ? <div className="space-y-2">{fb.data.map((f) => <Card key={f.id} hover={false} className="p-3.5 text-xs"><div className="font-bold">{"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)}</div><p className="mt-1">{f.comment}</p></Card>)}</div> : <EmptyState title="No feedback yet" description="Feedback is requested after a completed session." />)}
    </>
  );
}