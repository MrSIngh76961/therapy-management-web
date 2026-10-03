"use client";
import { MessageSquareReply, Star } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Avatar, Card, StatCard } from "@/components/ui/card";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/feedback";
import { Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/overlay";
import { PageHeader, StaggerGrid } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useCreate, useList, useUpdate } from "@/hooks/useResource";
import { cn } from "@/lib/cn";
import { fmtDate } from "@/lib/format";
import type { Appointment, Role } from "@/services/types";
import { useScope } from "./scope";

export const Stars = ({ value, onChange, size = 16 }: { value: number; onChange?: (v: number) => void; size?: number }) => (
  <span role={onChange ? "radiogroup" : "img"} aria-label={`${value} out of 5`} className="inline-flex gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => {
      const s = <Star style={{ width: size, height: size }} className={cn("transition-colors", n <= value ? "fill-[#f5a623] text-[#f5a623]" : "text-[#ddd]")} />;
      return onChange ? <button key={n} role="radio" aria-checked={n === value} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => onChange(n)} className="hover:scale-110">{s}</button> : <span key={n}>{s}</span>;
    })}
  </span>
);

export function FeedbackView({ role }: { role: Role }) {
  const { user } = useAuth();
  const scope = useScope(role);
  const q = useList("feedback", scope);
  const sessions = useList("appointments", { ...scope, status: "completed" }, role === "client");
  const create = useCreate("feedback"), update = useUpdate("feedback");
  const { toast } = useToast();
  const [tab, setTab] = useState("all");
  const [give, setGive] = useState(false);
  const [rating, setRating] = useState(5), [comment, setComment] = useState(""), [sessionId, setSessionId] = useState("");
  const [reply, setReply] = useState<{ id: string; text: string } | null>(null);
  const data = (q.data ?? []).filter((f) => tab === "all" || (tab === "pending" ? !f.reply : !!f.reply)).sort((a, b) => b.date.localeCompare(a.date));
  const avg = q.data?.length ? q.data.reduce((s, f) => s + f.rating, 0) / q.data.length : 0;
  const unrated = (sessions.data ?? []).filter((a: Appointment) => !q.data?.some((f) => f.sessionId === a.id));
  const sel = unrated.find((a) => a.id === sessionId) ?? unrated[0];

  return (
    <>
      <PageHeader eyebrow="Reflections" title="Feedback" subtitle={role === "client" ? "Tell your therapist how sessions are going." : "Review client feedback and respond."} actions={role === "client" && <Button icon={<Star className="size-3.5" />} disabled={!unrated.length} onClick={() => { setRating(5); setGive(true); }}>{unrated.length ? "Give feedback" : "All sessions rated"}</Button>} />
      <StaggerGrid className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Average rating" value={avg ? avg.toFixed(1) : "—"} icon={<Star className="size-4" />} />
        <StatCard label="Total reviews" value={q.data?.length ?? 0} />
        <StatCard label={role === "therapist" ? "Awaiting reply" : "Replied"} value={role === "therapist" ? (q.data ?? []).filter((f) => !f.reply).length : (q.data ?? []).filter((f) => f.reply).length} />
      </StaggerGrid>
      <Tabs className="mb-4 w-fit" value={tab} onChange={setTab} items={[{ id: "all", label: "All" }, { id: "pending", label: "Awaiting reply" }, { id: "replied", label: "Replied" }]} />
      {q.isLoading ? <CardSkeleton rows={3} /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : data.length === 0 ? <EmptyState icon={<Star className="size-6" />} title="No feedback here" description="Feedback appears after completed sessions." /> : (
        <div className="space-y-3">{data.map((f) => (
          <Card key={f.id} className="p-4">
            <div className="flex items-start gap-3"><Avatar name={role === "client" ? (user?.name ?? "Me") : f.clientName} size={36} />
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><div className="text-xs font-extrabold">{role === "client" ? "Your feedback" : f.clientName}</div><div className="flex items-center gap-2"><Stars value={f.rating} /><span className="text-[10px] text-muted">{fmtDate(f.date)}</span></div></div>
                <p className="mt-1.5 text-xs">{f.comment}</p>
                {f.reply && <div className="mt-2 rounded-lg border-l-2 border-wine bg-rose p-2.5 text-[11px]"><b className="text-wine">Therapist reply:</b> {f.reply}</div>}
                {role === "therapist" && <Button className="mt-2" size="sm" variant="outline" icon={<MessageSquareReply className="size-3" />} onClick={() => setReply({ id: f.id, text: f.reply ?? "" })}>{f.reply ? "Edit reply" : "Reply"}</Button>}
              </div></div>
          </Card>))}</div>
      )}
      <Modal open={give} onClose={() => setGive(false)} title="Session feedback" description="Your therapist will see this feedback."
        footer={<><Button variant="outline" onClick={() => setGive(false)}>Cancel</Button><Button loading={create.isPending} disabled={!sel || comment.trim().length < 5} onClick={async () => { try { await create.mutateAsync({ sessionId: sel!.id, clientId: sel!.clientId, clientName: sel!.clientName, therapistId: sel!.therapistId, rating, comment: comment.trim(), date: new Date().toISOString() }); toast("Thank you for your feedback"); setGive(false); setComment(""); } catch { toast("Could not submit feedback", "error"); } }}>Submit</Button></>}>
        <div className="space-y-3.5">
          <Select label="Session" value={sessionId || unrated[0]?.id || ""} onChange={(e) => setSessionId(e.target.value)} options={unrated.map((a) => ({ value: a.id, label: `${fmtDate(a.start)} · ${a.therapistName}` }))} />
          <div><div className="mb-1 text-[11px] font-bold">Rating</div><Stars value={rating} onChange={setRating} size={26} /></div>
          <Textarea label="Your feedback" hint="At least 5 characters" value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
      </Modal>
      <Modal open={!!reply} onClose={() => setReply(null)} title="Reply to feedback" footer={<><Button variant="outline" onClick={() => setReply(null)}>Cancel</Button><Button disabled={!reply?.text.trim()} loading={update.isPending} onClick={async () => { await update.mutateAsync({ id: reply!.id, reply: reply!.text.trim() }); toast("Reply sent"); setReply(null); }}>Send reply</Button></>}>
        <Textarea label="Your reply" value={reply?.text ?? ""} onChange={(e) => setReply((r) => r && { ...r, text: e.target.value })} />
      </Modal>
    </>
  );
}