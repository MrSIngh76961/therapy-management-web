"use client";
import { MessageSquareReply, MessageSquareQuote, Sparkles, Star, User } from "lucide-react";
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

export const Stars = ({
  value,
  onChange,
  size = 18,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
}) => (
  <span role={onChange ? "radiogroup" : "img"} aria-label={`${value} out of 5 stars`} className="inline-flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((n) => {
      const active = n <= value;
      const s = (
        <Star
          style={{ width: size, height: size }}
          className={cn(
            "transition-all duration-200",
            active ? "fill-amber-400 text-amber-400 drop-shadow-xs" : "fill-neutral-200 text-neutral-300"
          )}
        />
      );
      return onChange ? (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={active}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-125 focus:outline-none"
        >
          {s}
        </button>
      ) : (
        <span key={n}>{s}</span>
      );
    })}
  </span>
);

export function FeedbackView({ role }: { role: Role }) {
  const { user } = useAuth();
  const scope = useScope(role);
  const q = useList("feedback", scope);
  const sessions = useList("appointments", { ...scope, status: "completed" }, role === "client");
  const create = useCreate("feedback");
  const update = useUpdate("feedback");
  const { toast } = useToast();
  const [tab, setTab] = useState("all");
  const [give, setGive] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [reply, setReply] = useState<{ id: string; text: string } | null>(null);

  const data = (q.data ?? [])
    .filter((f) => tab === "all" || (tab === "pending" ? !f.reply : !!f.reply))
    .sort((a, b) => b.date.localeCompare(a.date));

  const avg = q.data?.length ? q.data.reduce((s, f) => s + f.rating, 0) / q.data.length : 0;
  const unrated = (sessions.data ?? []).filter((a: Appointment) => !q.data?.some((f) => f.sessionId === a.id));
  const sel = unrated.find((a) => a.id === sessionId) ?? unrated[0];

  return (
    <>
      <PageHeader
        eyebrow="Clinical Reflections"
        title="Session Feedback & Reviews"
        subtitle={
          role === "client"
            ? "Share your reflections following consultations to help tailor your personalized care experience."
            : "Review client ratings and feedback notes, and provide thoughtful therapist responses."
        }
        actions={
          role === "client" && (
            <Button
              icon={<Star className="size-3.5" />}
              disabled={!unrated.length}
              onClick={() => {
                setRating(5);
                setGive(true);
              }}
            >
              {unrated.length ? "Rate Completed Session" : "All Sessions Rated"}
            </Button>
          )
        }
      />

      <StaggerGrid className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Average Clinician Rating"
          value={avg ? `${avg.toFixed(1)} / 5.0` : "—"}
          tone="mint"
          icon={<Star className="size-4" />}
        />
        <StatCard
          label="Total Reviews Logged"
          value={q.data?.length ?? 0}
          tone="lavender"
          icon={<MessageSquareQuote className="size-4" />}
        />
        <StatCard
          label={role === "therapist" ? "Awaiting Response" : "Responses Received"}
          value={
            role === "therapist"
              ? (q.data ?? []).filter((f) => !f.reply).length
              : (q.data ?? []).filter((f) => f.reply).length
          }
          tone="coral"
          icon={<MessageSquareReply className="size-4" />}
        />
      </StaggerGrid>

      <Tabs
        className="mb-5 w-fit"
        value={tab}
        onChange={setTab}
        items={[
          { id: "all", label: "All Reviews" },
          { id: "pending", label: "Awaiting Reply" },
          { id: "replied", label: "Replied" },
        ]}
      />

      {q.isLoading ? (
        <CardSkeleton rows={3} />
      ) : q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : data.length === 0 ? (
        <EmptyState
          icon={<Star className="size-7 text-wine" />}
          title="No feedback records"
          description="Client reviews and clinical reflections will appear here following completed sessions."
        />
      ) : (
        <div className="space-y-4">
          {data.map((f) => (
            <Card key={f.id} hover={false} className="p-5">
              <div className="flex items-start gap-4">
                <Avatar name={role === "client" ? (user?.name ?? "Me") : f.clientName} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-extrabold text-ink">
                        {role === "client" ? "Your Feedback" : f.clientName}
                      </div>
                      <div className="text-[10px] text-muted">{fmtDate(f.date)}</div>
                    </div>
                    <Stars value={f.rating} />
                  </div>

                  <p className="mt-2.5 text-xs leading-relaxed text-ink/85 whitespace-pre-wrap">{f.comment}</p>

                  {f.reply && (
                    <div className="mt-3.5 rounded-xl border border-wine/20 bg-rose/40 p-3 text-xs">
                      <div className="mb-1 flex items-center gap-1.5 font-bold text-wine">
                        <MessageSquareReply className="size-3.5" />
                        Therapist Response
                      </div>
                      <p className="text-[11px] leading-relaxed text-ink/80 italic">{f.reply}</p>
                    </div>
                  )}

                  {role === "therapist" && (
                    <div className="mt-3.5 pt-2 border-t border-line/60">
                      <Button
                        size="sm"
                        variant="outline"
                        icon={<MessageSquareReply className="size-3" />}
                        onClick={() => setReply({ id: f.id, text: f.reply ?? "" })}
                      >
                        {f.reply ? "Edit Response" : "Write Response"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={give}
        onClose={() => setGive(false)}
        title="Share Session Feedback"
        description="Your feedback is shared directly with your therapist to support your continuous care."
        footer={
          <>
            <Button variant="outline" onClick={() => setGive(false)}>
              Cancel
            </Button>
            <Button
              loading={create.isPending}
              disabled={!sel || comment.trim().length < 5}
              onClick={async () => {
                try {
                  await create.mutateAsync({
                    sessionId: sel!.id,
                    clientId: sel!.clientId,
                    clientName: sel!.clientName,
                    therapistId: sel!.therapistId,
                    rating,
                    comment: comment.trim(),
                    date: new Date().toISOString(),
                  });
                  toast("Thank you for your valuable feedback!");
                  setGive(false);
                  setComment("");
                } catch {
                  toast("Could not submit feedback", "error");
                }
              }}
            >
              Submit Feedback
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Completed Session"
            value={sessionId || unrated[0]?.id || ""}
            onChange={(e) => setSessionId(e.target.value)}
            options={unrated.map((a) => ({
              value: a.id,
              label: `${fmtDate(a.start)} · ${a.serviceName} with ${a.therapistName}`,
            }))}
          />
          <div>
            <label className="mb-2 block text-xs font-bold text-ink">Rate your session experience</label>
            <div className="rounded-xl border border-line bg-warm-ivory p-3 text-center">
              <Stars value={rating} onChange={setRating} size={30} />
              <div className="mt-1 text-[11px] font-semibold text-muted">
                {rating === 5
                  ? "Excellent — Very supportive & insightful"
                  : rating === 4
                  ? "Good — Helpful session"
                  : rating === 3
                  ? "Average — Met basic expectations"
                  : "Needs improvement"}
              </div>
            </div>
          </div>
          <Textarea
            label="Your Thoughts & Observations"
            hint="Please provide at least 5 characters"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What was most helpful? What would you like to explore next?"
            rows={4}
          />
        </div>
      </Modal>

      <Modal
        open={!!reply}
        onClose={() => setReply(null)}
        title="Clinician Feedback Response"
        description="Your response will be visible to the client on their feedback dashboard."
        footer={
          <>
            <Button variant="outline" onClick={() => setReply(null)}>
              Cancel
            </Button>
            <Button
              disabled={!reply?.text.trim()}
              loading={update.isPending}
              onClick={async () => {
                await update.mutateAsync({ id: reply!.id, reply: reply!.text.trim() });
                toast("Response published to client");
                setReply(null);
              }}
            >
              Send Response
            </Button>
          </>
        }
      >
        <Textarea
          label="Therapeutic Response"
          value={reply?.text ?? ""}
          onChange={(e) => setReply((r) => r && { ...r, text: e.target.value })}
          placeholder="Acknowledge the client's reflection, validate their feelings and highlight next steps…"
          rows={4}
        />
      </Modal>
    </>
  );
}
