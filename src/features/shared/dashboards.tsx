"use client";
import { CalendarCheck, CalendarClock, ClipboardList, CreditCard, IndianRupee, Plus, Star, Users, Video } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Avatar, Card, ListItem, SectionCard, StatCard, StatusBadge } from "@/components/ui/card";
import { BarsChart } from "@/components/ui/charts";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { PageHeader, StaggerGrid } from "@/components/ui/page-header";
import { useApiQuery } from "@/hooks/useResource";
import { fmtDateTime, money } from "@/lib/format";
import type { Appointment } from "@/services/types";
import { modeLabel } from "./labels";

interface TherapistDash { today: Appointment[]; upcoming: Appointment[]; stats: { clients: number; sessionsMonth: number; pendingConsents: number; earnings: number; pendingTasks: number; avgRating: number }; weekly: { label: string; sessions: number }[] }
interface ClientDash { next: Appointment | null; upcoming: Appointment[]; stats: { completed: number; openTasks: number; dueAmount: number; therapists: number } }

const greet = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

function SessionRow({ a, role, who }: { a: Appointment; role: "therapist" | "client"; who: string }) {
  const router = useRouter();
  const joinable = ["scheduled", "link_shared", "joined", "live"].includes(a.status);
  return (
    <ListItem onClick={() => router.push(`/${role}/sessions/${a.id}`)}>
      <Avatar name={who} size={34} />
      <div className="min-w-0 flex-1"><div className="truncate text-xs font-bold">{who}</div><div className="truncate text-[10px] text-muted">{fmtDateTime(a.start)} · {modeLabel[a.mode]}</div></div>
      <StatusBadge status={a.status} />
      {joinable && <Link href={`/${role}/session/${a.id}`} onClick={(e) => e.stopPropagation()}><Button size="sm" icon={<Video className="size-3" />}>{a.status === "live" ? "Rejoin" : "Start"}</Button></Link>}
    </ListItem>
  );
}

export function TherapistDashboard() {
  const { user } = useAuth();
  const q = useApiQuery<TherapistDash>(["dashboard", "therapist"], "/therapist/dashboard");
  const d = q.data;
  return (
    <>
      <PageHeader eyebrow="Overview" title={`${greet()}, ${user?.name.split(" ").slice(0, 2).join(" ") ?? ""}`} subtitle="Your day at a glance." actions={<><Link href="/therapist/clients"><Button variant="outline" icon={<Users className="size-3.5" />}>My clients</Button></Link><Link href="/therapist/appointments?new=1"><Button icon={<Plus className="size-3.5" />}>New appointment</Button></Link></>} />
      {q.isError ? <ErrorState onRetry={() => q.refetch()} /> : (
        <>
          <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {!d ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[100px] rounded-[17px]" />) : <>
              <StatCard label="Active clients" value={d.stats.clients} delta={`${d.stats.pendingConsents} consent pending`} up={d.stats.pendingConsents === 0} icon={<Users className="size-4" />} />
              <StatCard label="Sessions (30 days)" value={d.stats.sessionsMonth} icon={<CalendarCheck className="size-4" />} />
              <StatCard label="Earnings" value={money(d.stats.earnings)} icon={<IndianRupee className="size-4" />} />
              <StatCard label="Open tasks" value={d.stats.pendingTasks} delta={`Avg rating ${d.stats.avgRating}`} icon={<Star className="size-4" />} />
            </>}
          </StaggerGrid>
          <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
            <SectionCard title="Today's sessions">{!d ? <Skeleton className="h-40" /> : d.today.length ? <div className="flex flex-col gap-2">{d.today.map((a) => <SessionRow key={a.id} a={a} role="therapist" who={a.clientName} />)}</div> : <EmptyState icon={<CalendarClock className="size-6" />} title="No sessions today" description="Enjoy the breathing room, or schedule a new session." />}</SectionCard>
            <SectionCard title="Sessions this week">{d ? <BarsChart data={d.weekly} xKey="label" bars={[{ key: "sessions", name: "Sessions" }]} height={200} /> : <Skeleton className="h-48" />}</SectionCard>
          </div>
          <SectionCard className="mt-4" title="Upcoming" action={<Link href="/therapist/appointments" className="text-[11px] font-bold text-wine">View all</Link>}>
            {!d ? <Skeleton className="h-24" /> : d.upcoming.length ? <div className="grid gap-2 md:grid-cols-2">{d.upcoming.map((a) => <SessionRow key={a.id} a={a} role="therapist" who={a.clientName} />)}</div> : <p className="text-xs text-muted">No upcoming sessions.</p>}
          </SectionCard>
        </>
      )}
    </>
  );
}

export function ClientHome() {
  const { user } = useAuth();
  const q = useApiQuery<ClientDash>(["dashboard", "client"], "/client/dashboard");
  const d = q.data;
  return (
    <>
      <PageHeader eyebrow="Welcome back" title={`${greet()}, ${user?.name.split(" ")[0] ?? ""}`} subtitle="Your care journey at a glance." actions={<Link href="/client/appointments?new=1"><Button icon={<Plus className="size-3.5" />}>Book a session</Button></Link>} />
      {q.isError ? <ErrorState onRetry={() => q.refetch()} /> : (
        <>
          <Card hover={false} className="mb-4 overflow-hidden border-0 bg-gradient-to-br from-wine to-wine-2 p-5 text-white">
            {!d ? <Skeleton className="h-16 bg-white/20" /> : d.next ? (
              <div className="flex flex-wrap items-center justify-between gap-4"><div><div className="text-[10px] font-extrabold uppercase tracking-wider text-white/70">Next session{d.next.status === "live" ? " · LIVE NOW" : ""}</div><div className="mt-1 text-lg font-extrabold">{fmtDateTime(d.next.start)}</div><div className="text-xs text-white/80">{d.next.therapistName} · {modeLabel[d.next.mode]} · {d.next.duration} min</div></div>
                <Link href={`/client/session/${d.next.id}`}><Button variant="soft" icon={<Video className="size-3.5" />}>{d.next.status === "live" ? "Join now" : "Open session room"}</Button></Link></div>
            ) : <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-lg font-extrabold">No session scheduled</div><div className="text-xs text-white/80">Book your next session with your therapist.</div></div><Link href="/client/appointments?new=1"><Button variant="soft">Book now</Button></Link></div>}
          </Card>
          <StaggerGrid className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {!d ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[100px] rounded-[17px]" />) : <>
              <StatCard label="Sessions completed" value={d.stats.completed} icon={<CalendarCheck className="size-4" />} />
              <StatCard label="Open tasks" value={d.stats.openTasks} up={d.stats.openTasks === 0} icon={<ClipboardList className="size-4" />} />
              <StatCard label="Amount due" value={money(d.stats.dueAmount)} up={d.stats.dueAmount === 0} icon={<CreditCard className="size-4" />} />
              <StatCard label="My therapists" value={d.stats.therapists} icon={<Users className="size-4" />} />
            </>}
          </StaggerGrid>
          <SectionCard className="mt-4" title="Upcoming sessions" action={<Link href="/client/appointments" className="text-[11px] font-bold text-wine">View all</Link>}>
            {!d ? <Skeleton className="h-24" /> : d.upcoming.length ? <div className="grid gap-2 md:grid-cols-2">{d.upcoming.map((a) => <SessionRow key={a.id} a={a} role="client" who={a.therapistName} />)}</div> : <p className="text-xs text-muted">Nothing upcoming.</p>}
          </SectionCard>
        </>
      )}
    </>
  );
}