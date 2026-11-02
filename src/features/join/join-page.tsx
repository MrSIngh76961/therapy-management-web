"use client";
import { CalendarClock, CheckCircle2, Clock, HeartPulse, LinkIcon, Lock, Mic, ShieldAlert, ShieldCheck, Sparkles, User, UserPlus, Video } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, Card, StatusBadge } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { useAction, useApiQuery } from "@/hooks/useResource";
import { fmtDateTime } from "@/lib/format";
import { api } from "@/services/api";
import type { SessionMode } from "@/services/types";
import { ConsentPolicy } from "@/features/shared/consent";
import { modeLabel } from "@/features/shared/labels";
import { SessionRoom } from "@/features/shared/session-room";

interface Join {
  appointment: {
    id: string;
    start: string;
    duration: number;
    mode: SessionMode;
    status: string;
    therapistName: string;
    serviceName: string;
  };
  client: { firstName: string; registration: string; email: string };
  consent: { id: string; status: string } | null;
}

/** Secure-link access: consent and join without an account. Everything is keyed by the signed token. */
export function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const q = useApiQuery<Join>(["join", token], `/join/${token}`);
  const { toast } = useToast();
  const [stage, setStage] = useState<"intro" | "room" | "after">("intro");
  const consent = useAction((status: "provided" | "withdrawn") => api.post(`/join/${token}/consent`, { status }), [
    "join",
    "consents",
    "clients",
  ]);
  const enter = useAction(() => api.post(`/join/${token}/enter`), ["join", "appointments"]);
  const d = q.data;
  const given = d?.consent?.status === "provided";
  const signup = `/signup?role=client&token=${encodeURIComponent(token)}${
    d ? `&email=${encodeURIComponent(d.client.email)}` : ""
  }`;

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Brand header */}
      <header className="flex items-center justify-between border-b border-line bg-white/80 px-6 py-3.5 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-wine to-[#d15d7d] text-white shadow-xs">
            <HeartPulse className="size-5" />
          </div>
          <div>
            <span className="font-extrabold text-ink text-base tracking-tight">TheraFlow</span>
            <div className="text-[10px] uppercase font-bold text-muted">Telehealth Consultation</div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose/80 px-3 py-1 text-xs font-bold text-wine border border-wine/10">
          <LinkIcon className="size-3.5" />
          Secure Encrypted Link
        </span>
      </header>

      <main className="mx-auto max-w-5xl p-5 sm:p-8">
        {q.isLoading ? (
          <Skeleton className="mx-auto mt-12 h-72 max-w-xl rounded-3xl" />
        ) : q.isError || !d ? (
          <div className="mx-auto mt-12 max-w-xl">
            <ErrorState
              message={q.error instanceof Error ? q.error.message : "This consultation link is invalid, expired, or has already been used."}
              onRetry={() => q.refetch()}
            />
          </div>
        ) : stage === "room" ? (
          <SessionRoom
            session={{ ...d.appointment, clientName: d.client.firstName }}
            role="client"
            guestName={d.client.firstName}
            exitHref={`/join/${token}`}
          />
        ) : stage === "after" ? (
          <Card hover={false} className="mx-auto mt-12 max-w-md p-8 text-center shadow-card">
            <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-mint text-ok shadow-xs">
              <CheckCircle2 className="size-8" />
            </div>
            <h1 className="text-xl font-black text-ink">Thank You for Attending</h1>
            <p className="mt-2 text-xs text-muted leading-relaxed">
              Create your complimentary TheraFlow account to access your session summary, complete care exercises, and access shared worksheets. All session activity is automatically linked to your email.
            </p>
            <Link href={signup}>
              <Button className="mt-6 w-full" size="lg" icon={<UserPlus className="size-4" />}>
                Create My Client Account
              </Button>
            </Link>
            <button
              onClick={() => setStage("intro")}
              className="mt-4 text-xs font-semibold text-muted hover:text-wine transition-colors"
            >
              Return to Session Overview
            </button>
          </Card>
        ) : (
          <div className="mx-auto mt-6 grid max-w-4xl gap-6 md:grid-cols-[1.1fr_1.2fr]">
            {/* Left Column: Appointment summary & steps */}
            <Card hover={false} className="space-y-4 p-6 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-wine">
                  Welcome, {d.client.firstName}
                </span>
                <StatusBadge status={d.appointment.status} />
              </div>

              <div>
                <h1 className="text-xl font-black text-ink">{d.appointment.serviceName}</h1>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                  <Avatar name={d.appointment.therapistName} size={22} />
                  <span>With <b className="text-ink">{d.appointment.therapistName}</b></span>
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-warm-ivory p-3.5 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-ink">
                  <CalendarClock className="size-4 text-wine" />
                  <span className="font-semibold">{fmtDateTime(d.appointment.start)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted">
                  <Clock className="size-4" />
                  <span>{d.appointment.duration} Minutes Scheduled</span>
                </div>
                <div className="flex items-center gap-2 text-muted">
                  {d.appointment.mode === "audio" ? <Mic className="size-4" /> : <Video className="size-4" />}
                  <span>{modeLabel[d.appointment.mode]} Mode</span>
                </div>
              </div>

              <div className="border-t border-line/60 pt-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2.5">
                  Consultation Milestones
                </div>
                <ol className="space-y-2.5 text-xs">
                  {[
                    ["Review & Grant DPDPA Consent", given],
                    [
                      "Join Secure Consultation Room",
                      ["joined", "live", "completed"].includes(d.appointment.status),
                    ],
                    ["Save Care History to Free Account", d.client.registration === "registered"],
                  ].map(([label, done], idx) => (
                    <li key={idx} className="flex items-center gap-2.5">
                      <span
                        className={`grid size-5 place-items-center rounded-full text-[10px] font-bold ${
                          done ? "bg-ok text-white" : "bg-neutral-200 text-muted"
                        }`}
                      >
                        {done ? "✓" : idx + 1}
                      </span>
                      <span className={done ? "font-bold text-ink" : "text-muted"}>{label as string}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </Card>

            {/* Right Column: Consent policy & Entry Action */}
            <div className="space-y-5">
              <ConsentPolicy />

              {d.appointment.status === "completed" || d.appointment.status === "cancelled" ? (
                <Card hover={false} variant="coral" className="p-5 text-center">
                  <h3 className="font-bold text-bad">This consultation is {d.appointment.status}</h3>
                  <p className="mt-1 text-xs text-muted">Please contact your clinician if you need to reschedule.</p>
                </Card>
              ) : given ? (
                <Card hover={false} variant="mint" className="space-y-3.5 p-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-ok">
                    <ShieldCheck className="size-4" />
                    Bilateral DPDPA Consent Verified
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    loading={enter.isPending}
                    icon={<Video className="size-4" />}
                    onClick={async () => {
                      try {
                        await enter.mutateAsync(undefined);
                        setStage("room");
                      } catch (e) {
                        toast(e instanceof Error ? e.message : "Could not enter room", "error");
                      }
                    }}
                  >
                    Enter Consultation Room Now
                  </Button>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      className="text-[11px] font-semibold text-muted hover:text-bad transition-colors"
                      onClick={async () => {
                        await consent.mutateAsync("withdrawn");
                        toast("Consent withdrawn", "info");
                      }}
                    >
                      Withdraw Consent
                    </button>
                    <button
                      className="text-[11px] font-bold text-wine hover:underline"
                      onClick={() => setStage("after")}
                    >
                      Create Account Instead
                    </button>
                  </div>
                </Card>
              ) : (
                <Card hover={false} className="space-y-3 p-5">
                  <div className="text-xs font-bold text-ink">Consent required to proceed</div>
                  <p className="text-[11px] text-muted">
                    In compliance with the Digital Personal Data Protection Act 2023, your therapist requires your consent before starting this consultation.
                  </p>
                  <Button
                    className="w-full"
                    size="lg"
                    loading={consent.isPending}
                    onClick={async () => {
                      try {
                        await consent.mutateAsync("provided");
                        toast("Thank you — consent verified");
                      } catch {
                        toast("Could not record consent", "error");
                      }
                    }}
                  >
                    I Agree & Grant Consent
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={async () => {
                      await consent.mutateAsync("withdrawn");
                      toast("Consent declined. Your therapist has been notified.", "info");
                    }}
                  >
                    Decline
                  </Button>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
