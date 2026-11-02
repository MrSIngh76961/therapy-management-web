"use client";
import { Check, CheckCircle2, Clock, FileCheck, FileText, Lock, MessageSquare, MessageSquarePlus, Mic, Share2, Sparkles, User, Video, VideoOff } from "lucide-react";
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
import { fmtBytes, fmtDate, fmtDateTime, money } from "@/lib/format";
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
      {!embedded && (
        <PageHeader
          eyebrow="Clinical History"
          title="Past Sessions"
          subtitle={
            role === "client"
              ? "Comprehensive records, shared insights, transcripts and homework from your therapeutic journey."
              : "Past clinical consultations with clinical summaries, transcripts, homework and post-session remarks."
          }
        />
      )}
      <DataTable
        resource="appointments"
        baseParams={base}
        searchPlaceholder="Search past sessions by client, therapist, or service…"
        defaultSort={{ key: "start", dir: "desc" }}
        onRowClick={(a) => router.push(`/${role}/sessions/${a.id}`)}
        filters={[
          {
            key: "status",
            label: "Status",
            options: sessionStatusOptions.filter((o) => ["completed", "cancelled", "no_show"].includes(o.value)),
          },
          {
            key: "mode",
            label: "Mode",
            options: [
              { value: "video", label: "Video" },
              { value: "audio", label: "Audio" },
              { value: "in_person", label: "In person" },
            ],
          },
        ]}
        emptyTitle="No past sessions"
        emptyDescription="Completed and archived consultations will automatically appear here."
        columns={[
          {
            key: "start",
            header: "Date & Time",
            sortable: true,
            render: (a: Appointment) => (
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-rose/80 text-wine">
                  {a.mode === "audio" ? <Mic className="size-4" /> : a.mode === "video" ? <Video className="size-4" /> : <Clock className="size-4" />}
                </div>
                <div>
                  <div className="font-semibold text-ink">{fmtDateTime(a.start)}</div>
                  <div className="text-[10px] text-muted">{a.duration} minutes</div>
                </div>
              </div>
            ),
          },
          ...(role === "therapist" && !clientId
            ? [
                {
                  key: "clientName",
                  header: "Client",
                  sortable: true,
                  render: (a: Appointment) => (
                    <div className="flex items-center gap-2">
                      <Avatar name={a.clientName} size={26} />
                      <span className="font-medium">{a.clientName}</span>
                    </div>
                  ),
                },
              ]
            : []),
          ...(role === "client" && !therapistId
            ? [
                {
                  key: "therapistName",
                  header: "Therapist",
                  sortable: true,
                  render: (a: Appointment) => (
                    <div className="flex items-center gap-2">
                      <Avatar name={a.therapistName} size={26} />
                      <span className="font-medium">{a.therapistName}</span>
                    </div>
                  ),
                },
              ]
            : []),
          {
            key: "serviceName",
            header: "Service",
            hideBelow: "md" as const,
            render: (a: Appointment) => <span className="font-medium text-ink/80">{a.serviceName}</span>,
          },
          {
            key: "mode",
            header: "Mode",
            hideBelow: "sm" as const,
            render: (a: Appointment) => {
              const mode = a.mode;
              const isVideo = mode === "video";
              const isAudio = mode === "audio";
              return (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                    isVideo && "bg-soft-blue text-info border border-info/20",
                    isAudio && "bg-lavender text-[#5b21b6] border border-[#5b21b6]/20",
                    !isVideo && !isAudio && "bg-mint text-ok border border-ok/20"
                  )}
                >
                  {isVideo ? <Video className="size-3" /> : isAudio ? <Mic className="size-3" /> : <Clock className="size-3" />}
                  {modeLabel[mode]}
                </span>
              );
            },
          },
          {
            key: "summary",
            header: "Notes",
            hideBelow: "lg" as const,
            render: (a: Appointment) =>
              a.summary ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-mint/80 px-2 py-0.5 text-[10px] font-bold text-ok">
                  <Check className="size-3" />
                  Recorded
                </span>
              ) : (
                <span className="text-muted">—</span>
              ),
          },
          {
            key: "status",
            header: "Status",
            sortable: true,
            render: (a: Appointment) => <StatusBadge status={a.status} />,
          },
        ]}
      />
    </>
  );
}

export function SessionDetail({ role }: { role: Role }) {
  const { id } = useParams<{ id: string }>();
  const q = useItem("appointments", id);
  const [tab, setTab] = useState("summary");
  const [text, setText] = useState("");
  const [vis, setVis] = useState<"private" | "shared">("shared");
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

  if (q.isError)
    return (
      <>
        <PageHeader back={{ href: back, label: "Sessions" }} title="Session Details" />
        <ErrorState message="This session could not be found or loaded." onRetry={() => q.refetch()} />
      </>
    );
  if (!a)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-40" />
      </div>
    );

  const comments = (a.comments ?? []).filter((c) => therapist || c.visibility === "shared");
  const upcoming = ["scheduled", "link_shared", "joined", "live"].includes(a.status);

  return (
    <>
      <PageHeader
        back={{ href: back, label: "Sessions" }}
        eyebrow={a.serviceName}
        title={fmtDateTime(a.start)}
        subtitle={`${therapist ? `Client: ${a.clientName}` : `Therapist: ${a.therapistName}`} · ${a.duration} minutes · ${modeLabel[a.mode]}`}
        actions={
          <>
            <StatusBadge status={a.status} />
            {therapist && ["scheduled", "link_shared"].includes(a.status) && (
              <Button
                variant="outline"
                size="sm"
                icon={<Share2 className="size-3.5" />}
                loading={share.isPending}
                onClick={async () => {
                  const r = await share.mutateAsync();
                  await navigator.clipboard?.writeText(`${location.origin}${r.url}`).catch(() => {});
                  toast("Secure session link copied to clipboard");
                }}
              >
                Share Link
              </Button>
            )}
            {upcoming && role !== "admin" && (
              <Link href={`/${role}/session/${a.id}`}>
                <Button size="sm" icon={a.mode === "audio" ? <Mic className="size-3.5" /> : <Video className="size-3.5" />}>
                  {a.status === "live" ? "Rejoin Session" : "Start Session"}
                </Button>
              </Link>
            )}
          </>
        }
      />

      {/* Meta quick strip */}
      <div className="mb-5 flex flex-wrap items-center gap-2.5 rounded-2xl border border-line bg-gradient-to-r from-warm-ivory via-white to-rose/30 p-3 text-xs shadow-xs">
        <div className="flex items-center gap-2 pr-3 border-r border-line/60">
          <Avatar name={therapist ? a.clientName : a.therapistName} size={28} />
          <div>
            <div className="text-[10px] uppercase font-bold text-muted">{therapist ? "Client" : "Therapist"}</div>
            <div className="font-bold text-ink">{therapist ? a.clientName : a.therapistName}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 border-r border-line/60">
          <Clock className="size-4 text-wine" />
          <div>
            <div className="text-[10px] uppercase font-bold text-muted">Duration</div>
            <div className="font-semibold text-ink">{a.duration} min</div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 border-r border-line/60">
          <div className="font-bold text-wine">₹</div>
          <div>
            <div className="text-[10px] uppercase font-bold text-muted">Consultation Fee</div>
            <div className="font-semibold text-ink">{money(a.fee)}</div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-muted">Payment status:</span>
          <StatusBadge status={a.paymentStatus} />
        </div>
      </div>

      <Tabs
        className="mb-5 w-fit"
        value={tab}
        onChange={setTab}
        items={[
          { id: "summary", label: "Clinical Summary" },
          { id: "transcript", label: "AI Transcript", count: a.transcript?.length },
          { id: "comments", label: "Comments & Notes", count: comments.length },
          { id: "tasks", label: "Homework Tasks", count: tasks.data?.length },
          { id: "docs", label: "Documents", count: docs.data?.length },
          { id: "feedback", label: "Feedback", count: fb.data?.length },
        ]}
      />

      {tab === "summary" && (
        <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          <SectionCard
            title="Session Clinical Summary"
            action={
              therapist && (
                <span className="text-[11px] text-muted font-medium">Visible to you; shared when marked</span>
              )
            }
          >
            {therapist && a.status !== "cancelled" ? (
              <div className="space-y-3.5">
                <Textarea
                  label="Clinical summary & recommendations"
                  value={summary ?? a.summary ?? ""}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Key themes explored, therapeutic modalities used, breakthroughs, client affect, homework rationale…"
                  rows={6}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted">Encrypted & stored under DPDPA standards.</span>
                  <Button
                    size="sm"
                    disabled={summary === null || summary === (a.summary ?? "")}
                    loading={saveSummary.isPending}
                    onClick={async () => {
                      await saveSummary.mutateAsync(summary!);
                      setSummary(null);
                      toast("Clinical summary saved successfully");
                    }}
                  >
                    Save Clinical Summary
                  </Button>
                </div>
              </div>
            ) : a.summary ? (
              <div className="rounded-xl border border-line bg-gradient-to-br from-warm-ivory to-white p-5">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-wine">
                  <Sparkles className="size-4" />
                  Key Takeaways from your Therapist
                </div>
                <p className="text-xs leading-relaxed text-ink/80 whitespace-pre-wrap">{a.summary}</p>
              </div>
            ) : (
              <EmptyState
                icon={<FileText className="size-6 text-wine" />}
                title="No summary yet"
                description="A clinical summary will appear here once your therapist completes and saves their notes."
              />
            )}
          </SectionCard>

          <div className="space-y-4">
            <SectionCard title="Consultation Details">
              <div className="space-y-3">
                <KV label="Therapist">{a.therapistName}</KV>
                <KV label="Client">{a.clientName}</KV>
                <KV label="Service Tier">{a.serviceName}</KV>
                <KV label="Consultation Mode">{modeLabel[a.mode]}</KV>
                <KV label="Session Fee">{money(a.fee)}</KV>
                <KV label="Payment Status"><StatusBadge status={a.paymentStatus} /></KV>
              </div>
            </SectionCard>

            <Card hover={false} variant="rose" className="p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-wine">
                <Lock className="size-3.5" />
                DPDPA 2023 Compliant Storage
              </div>
              <p className="mt-1 text-[11px] text-muted">
                Consultation metadata and post-session notes are encrypted and processed within India in full accordance with the Digital Personal Data Protection Act.
              </p>
            </Card>
          </div>
        </div>
      )}

      {tab === "transcript" && (
        <SectionCard
          title="Encrypted AI Session Transcript"
          action={
            a.transcript?.length ? (
              <span className="text-[11px] text-muted font-medium">{a.transcript.length} turns recorded</span>
            ) : undefined
          }
        >
          {a.transcript?.length ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-line bg-gradient-to-r from-soft-blue/40 via-white to-mint/40 p-3 text-xs text-muted flex items-center gap-2">
                <Sparkles className="size-4 text-wine shrink-0" />
                <span>Captured in real-time via Web Speech / Whisper API with client and therapist consent.</span>
              </div>
              <ul className="space-y-3 pt-2">
                {a.transcript.map((l) => {
                  const isTherapist = l.speaker === "therapist";
                  return (
                    <li
                      key={l.id}
                      className={cn(
                        "flex gap-3 rounded-xl p-3 text-xs",
                        isTherapist ? "bg-rose/30 border border-wine/10" : "bg-soft-blue/30 border border-info/10"
                      )}
                    >
                      <Avatar name={isTherapist ? a.therapistName : a.clientName} size={32} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className={isTherapist ? "text-wine" : "text-info"}>
                            {isTherapist ? a.therapistName : a.clientName} ({isTherapist ? "Therapist" : "Client"})
                          </span>
                          <span className="text-[10px] text-muted font-normal">{l.at}</span>
                        </div>
                        <p className="mt-1 leading-relaxed text-ink/90">{l.text}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <EmptyState
              icon={<Mic className="size-6 text-wine" />}
              title="No transcript recorded"
              description="Transcripts are only captured when live transcription is enabled by mutual consent during video/audio sessions."
            />
          )}
        </SectionCard>
      )}

      {tab === "comments" && (
        <div className="space-y-5">
          {therapist && (
            <SectionCard title="Add Post-Session Observation">
              <div className="space-y-3.5">
                <Textarea
                  label="Comment or Note"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Record observations, client affect, homework rationale or next session goals…"
                />
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="w-56">
                    <Select
                      label="Visibility"
                      value={vis}
                      onChange={(e) => setVis(e.target.value as "private" | "shared")}
                      options={[
                        { value: "shared", label: "Shared with client" },
                        { value: "private", label: "Private therapist note" },
                      ]}
                    />
                  </div>
                  <Button
                    icon={<MessageSquarePlus className="size-3.5" />}
                    disabled={text.trim().length < 3}
                    loading={addComment.isPending}
                    onClick={async () => {
                      await addComment.mutateAsync({ text: text.trim(), visibility: vis });
                      setText("");
                      toast("Observation added");
                    }}
                  >
                    Add Comment
                  </Button>
                </div>
              </div>
            </SectionCard>
          )}

          {comments.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="size-6 text-wine" />}
              title="No comments recorded"
              description={therapist ? "Add private notes or shared client reflections above." : "Your therapist hasn't added shared comments for this session."}
            />
          ) : (
            <div className="space-y-3">
              {comments.map((c) => {
                const isPriv = c.visibility === "private";
                return (
                  <Card
                    key={c.id}
                    hover={false}
                    variant={isPriv ? "coral" : "ivory"}
                    className="p-4"
                  >
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-semibold text-muted">{fmtDateTime(c.at)}</span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                          isPriv ? "bg-warn/15 text-warn border border-warn/30" : "bg-mint text-ok border border-ok/30"
                        )}
                      >
                        {isPriv && <Lock className="size-3" />}
                        {isPriv ? "Private Clinician Note" : "Shared with Client"}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-ink/90 whitespace-pre-wrap">{c.text}</p>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "tasks" && (
        <SectionCard title="Connected Care Tasks">
          {tasks.data?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {tasks.data.map((t) => (
                <Card key={t.id} hover={false} className="flex items-center justify-between p-4 text-xs">
                  <div>
                    <div className="font-bold text-ink">{t.title}</div>
                    <div className="mt-1 text-[11px] text-muted">Due {fmtDate(t.due)}</div>
                  </div>
                  <StatusBadge status={t.status} />
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FileCheck className="size-6 text-wine" />}
              title="No tasks linked"
              description="Homework and exercises assigned in relation to this session will appear here."
            />
          )}
        </SectionCard>
      )}

      {tab === "docs" && (
        <SectionCard title="Worksheets & Documents Shared">
          {docs.data?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {docs.data.map((d) => (
                <Card key={d.id} hover={false} className="flex items-center justify-between p-4 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-8 place-items-center rounded-lg bg-rose text-wine font-bold uppercase text-[10px]">
                      {d.ext}
                    </div>
                    <div>
                      <div className="font-bold text-ink">{d.name}</div>
                      <div className="text-[10px] text-muted">{fmtBytes(d.size)}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FileText className="size-6 text-wine" />}
              title="No documents linked"
              description="Files shared before, during or after this session will show up here."
            />
          )}
        </SectionCard>
      )}

      {tab === "feedback" && (
        <SectionCard title="Client Feedback & Reflections">
          {fb.data?.length ? (
            <div className="space-y-3">
              {fb.data.map((f) => (
                <Card key={f.id} hover={false} variant="ivory" className="p-4 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-amber-500 font-extrabold tracking-widest text-sm">
                      {"★".repeat(f.rating)}
                      <span className="text-gray-300">{"★".repeat(5 - f.rating)}</span>
                    </div>
                    <span className="text-[10px] text-muted">{fmtDate(f.date)}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-ink/80">{f.comment}</p>
                  {f.reply && (
                    <div className="mt-3 rounded-lg border-l-2 border-wine bg-rose/55 p-2.5 text-[11px]">
                      <b className="text-wine">Therapist reply:</b> {f.reply}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Sparkles className="size-6 text-wine" />}
              title="No feedback yet"
              description="Feedback is requested following session completion."
            />
          )}
        </SectionCard>
      )}
    </>
  );
}
