"use client";
import { CalendarClock, CheckCircle2, HeartPulse, LinkIcon, ShieldCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, StatusBadge } from "@/components/ui/card";
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
  appointment: { id: string; start: string; duration: number; mode: SessionMode; status: string; therapistName: string; serviceName: string };
  client: { firstName: string; registration: string; email: string };
  consent: { id: string; status: string } | null;
}

/** Secure-link access: consent and join without an account. Everything is keyed by the signed token. */
export function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const q = useApiQuery<Join>(["join", token], `/join/${token}`);
  const { toast } = useToast();
  const [stage, setStage] = useState<"intro" | "room" | "after">("intro");
  const consent = useAction((status: "provided" | "withdrawn") => api.post(`/join/${token}/consent`, { status }), ["join", "consents", "clients"]);
  const enter = useAction(() => api.post(`/join/${token}/enter`), ["join", "appointments"]);
  const d = q.data;
  const given = d?.consent?.status === "provided";
  const signup = `/signup?role=client&token=${encodeURIComponent(token)}${d ? `&email=${encodeURIComponent(d.client.email)}` : ""}`;

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="flex items-center justify-between border-b border-line bg-white px-5 py-3"><div className="flex items-center gap-2 font-extrabold text-wine"><HeartPulse className="size-5" />TheraFlow</div><span className="flex items-center gap-1 text-[11px] font-semibold text-muted"><LinkIcon className="size-3" />Secure session link</span></header>
      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        {q.isLoading ? <Skeleton className="mx-auto mt-10 h-64 max-w-xl" /> : q.isError || !d ? <div className="mx-auto mt-10 max-w-xl"><ErrorState message={q.error instanceof Error ? q.error.message : "This session link is invalid or has expired."} onRetry={() => q.refetch()} /></div> : stage === "room" ? (
          <SessionRoom session={{ ...d.appointment, clientName: d.client.firstName }} role="client" guestName={d.client.firstName} exitHref={`/join/${token}`} />
        ) : stage === "after" ? (
          <Card hover={false} className="mx-auto mt-10 max-w-md p-7 text-center"><div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-[#e9f7f0] text-ok"><CheckCircle2 className="size-7" /></div>
            <h1 className="text-lg font-extrabold">Thanks for joining</h1><p className="mt-1 text-xs text-muted">Create a free account to keep your sessions, tasks and documents in one place. Everything from this link is moved to your account automatically.</p>
            <Link href={signup}><Button className="mt-5 w-full" icon={<UserPlus className="size-4" />}>Create my account</Button></Link><button onClick={() => setStage("intro")} className="mt-3 text-[11px] font-semibold text-muted hover:text-wine">Back to session</button></Card>
        ) : (
          <div className="mx-auto mt-4 grid max-w-3xl gap-4 md:grid-cols-[1fr_1.1fr]">
            <Card hover={false} className="space-y-3 p-5"><div className="text-[10px] font-extrabold uppercase tracking-wider text-wine">Hello, {d.client.firstName}</div><h1 className="text-lg font-extrabold">{d.appointment.serviceName} with {d.appointment.therapistName}</h1>
              <p className="flex items-center gap-1.5 text-xs text-muted"><CalendarClock className="size-3.5" />{fmtDateTime(d.appointment.start)} · {d.appointment.duration} min · {modeLabel[d.appointment.mode]}</p><StatusBadge status={d.appointment.status} />
              <ol className="space-y-2 pt-2 text-xs">{[["Review and give consent", given], ["Join your session", d.appointment.status === "joined" || d.appointment.status === "live" || d.appointment.status === "completed"], ["Create an account (optional)", d.client.registration === "registered"]].map(([l, ok]) => <li key={String(l)} className="flex items-center gap-2"><span className={`grid size-5 place-items-center rounded-full text-[10px] font-bold ${ok ? "bg-ok text-white" : "bg-[#f1e8eb] text-muted"}`}>{ok ? "✓" : "•"}</span>{l}</li>)}</ol></Card>
            <div className="space-y-4">
              <ConsentPolicy />
              {d.appointment.status === "completed" || d.appointment.status === "cancelled" ? <ErrorState message={`This session is ${d.appointment.status}.`} /> : given ? (
                <Card hover={false} className="space-y-3 p-4"><div className="flex items-center gap-2 text-xs font-bold text-ok"><ShieldCheck className="size-4" />Consent recorded</div>
                  <Button className="w-full" size="lg" loading={enter.isPending} onClick={async () => { try { await enter.mutateAsync(undefined); setStage("room"); } catch (e) { toast(e instanceof Error ? e.message : "Could not join", "error"); } }}>Join session</Button>
                  <button className="w-full text-[11px] font-semibold text-muted hover:text-bad" onClick={async () => { await consent.mutateAsync("withdrawn"); toast("Consent withdrawn", "info"); }}>Withdraw consent</button>
                  <button className="w-full text-[11px] font-semibold text-wine hover:underline" onClick={() => setStage("after")}>I&apos;m done — create an account</button></Card>
              ) : (
                <Card hover={false} className="space-y-2 p-4"><Button className="w-full" loading={consent.isPending} onClick={async () => { try { await consent.mutateAsync("provided"); toast("Thank you — consent recorded"); } catch { toast("Could not record consent", "error"); } }}>I agree and give consent</Button>
                  <Button variant="outline" className="w-full" onClick={async () => { await consent.mutateAsync("withdrawn"); toast("You have declined. Your therapist has been notified.", "info"); }}>Decline</Button></Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}