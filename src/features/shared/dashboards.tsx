"use client";
import {
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  CreditCard,
  IndianRupee,
  Plus,
  Radio,
  Sparkles,
  Star,
  Users,
  Video,
} from "lucide-react";
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

interface TherapistDash {
  today: Appointment[];
  upcoming: Appointment[];
  stats: {
    clients: number;
    sessionsMonth: number;
    pendingConsents: number;
    earnings: number;
    pendingTasks: number;
    avgRating: number;
  };
  weekly: { label: string; sessions: number }[];
}

interface ClientDash {
  next: Appointment | null;
  upcoming: Appointment[];
  stats: { completed: number; openTasks: number; dueAmount: number; therapists: number };
}

const greet = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

function SessionRow({ a, role, who }: { a: Appointment; role: "therapist" | "client"; who: string }) {
  const router = useRouter();
  const joinable = ["scheduled", "link_shared", "joined", "live"].includes(a.status);
  const isLive = a.status === "live";

  return (
    <ListItem
      onClick={() => router.push(`/${role}/sessions/${a.id}`)}
      className="justify-between"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={who} size={38} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-xs font-black text-[#1F191D]">{who}</span>
            {isLive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FFDBDF] px-2 py-0.2 text-[9px] font-black text-[#9F1239]">
                <Radio className="size-2.5 animate-pulse" /> LIVE NOW
              </span>
            )}
          </div>
          <div className="truncate text-[11px] text-[#6E686F]">
            {fmtDateTime(a.start)} · {modeLabel[a.mode]} ({a.duration} min)
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <StatusBadge status={a.status} />
        {joinable && (
          <Link href={`/${role}/session/${a.id}`} onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant={isLive ? "primary" : "soft"}
              icon={<Video className="size-3.5" />}
            >
              {isLive ? "Rejoin Room" : "Start"}
            </Button>
          </Link>
        )}
      </div>
    </ListItem>
  );
}

export function TherapistDashboard() {
  const { user } = useAuth();
  const q = useApiQuery<TherapistDash>(["dashboard", "therapist"], "/therapist/dashboard");
  const d = q.data;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-[#EBC3D3] bg-gradient-to-r from-white via-[#FFF8FA] to-[#FFF4F7] p-5 shadow-card sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F4DCE6] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#98143F]">
              <Sparkles className="size-3" />
              Clinician Workspace
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#1F191D] sm:text-3xl">
            {greet()}, {user?.name.split(" ").slice(0, 2).join(" ") ?? ""}
          </h1>
          <p className="mt-1 text-xs text-[#6E686F]">
            Here is your daily clinical agenda, client progress, and practice schedule.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/therapist/clients">
            <Button variant="outline" icon={<Users className="size-3.5" />}>
              My clients
            </Button>
          </Link>
          <Link href="/therapist/appointments?new=1">
            <Button icon={<Plus className="size-3.5" />}>New appointment</Button>
          </Link>
        </div>
      </div>

      {q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : (
        <>
          <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {!d ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[120px] rounded-[18px]" />
              ))
            ) : (
              <>
                <StatCard
                  tone="mint"
                  label="Active Clients"
                  value={d.stats.clients}
                  delta={`${d.stats.pendingConsents} consent pending`}
                  up={d.stats.pendingConsents === 0}
                  icon={<Users className="size-4.5" />}
                />
                <StatCard
                  tone="wine"
                  label="Sessions (30 Days)"
                  value={d.stats.sessionsMonth}
                  delta="Clinical sessions conducted"
                  up={true}
                  icon={<CalendarCheck className="size-4.5" />}
                />
                <StatCard
                  tone="coral"
                  label="Monthly Earnings"
                  value={money(d.stats.earnings)}
                  delta="Estimated clinical fee"
                  up={true}
                  icon={<IndianRupee className="size-4.5" />}
                />
                <StatCard
                  tone="lavender"
                  label="Care Tasks & Rating"
                  value={`${d.stats.pendingTasks} tasks`}
                  delta={`Average rating ${d.stats.avgRating} ★`}
                  up={d.stats.avgRating >= 4.5}
                  icon={<Star className="size-4.5" />}
                />
              </>
            )}
          </StaggerGrid>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <SectionCard
              variant="ivory"
              title="Today's Sessions Schedule"
              subtitle="Sessions booked for today"
            >
              {!d ? (
                <Skeleton className="h-44 rounded-xl" />
              ) : d.today.length ? (
                <div className="flex flex-col gap-2.5">
                  {d.today.map((a) => (
                    <SessionRow key={a.id} a={a} role="therapist" who={a.clientName} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<CalendarClock className="size-6 text-[#98143F]" />}
                  title="No sessions scheduled for today"
                  description="Enjoy the breathing room, or schedule a new appointment with a client."
                  action={
                    <Link href="/therapist/appointments?new=1">
                      <Button size="sm" icon={<Plus className="size-3.5" />}>
                        Schedule appointment
                      </Button>
                    </Link>
                  }
                />
              )}
            </SectionCard>

            <SectionCard
              variant="ivory"
              title="Sessions This Week"
              subtitle="Weekly appointment velocity"
            >
              {d ? (
                <BarsChart
                  data={d.weekly}
                  xKey="label"
                  bars={[{ key: "sessions", name: "Sessions" }]}
                  height={220}
                />
              ) : (
                <Skeleton className="h-48 rounded-xl" />
              )}
            </SectionCard>
          </div>

          <SectionCard
            className="mt-5"
            title="Upcoming Clinical Appointments"
            subtitle="Future scheduled sessions"
            action={
              <Link
                href="/therapist/appointments"
                className="text-xs font-extrabold text-[#98143F] transition-colors hover:underline"
              >
                View all ({d?.upcoming.length ?? 0})
              </Link>
            }
          >
            {!d ? (
              <Skeleton className="h-28 rounded-xl" />
            ) : d.upcoming.length ? (
              <div className="grid gap-2.5 md:grid-cols-2">
                {d.upcoming.map((a) => (
                  <SessionRow key={a.id} a={a} role="therapist" who={a.clientName} />
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-xs text-[#888188]">No upcoming sessions scheduled.</p>
            )}
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F4DCE6] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#98143F]">
            <Sparkles className="size-3" />
            Client Health Portal
          </span>
          <h1 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#1F191D] sm:text-3xl">
            {greet()}, {user?.name.split(" ")[0] ?? ""}
          </h1>
          <p className="mt-1 text-xs text-[#6E686F]">
            Your dedicated care space: upcoming sessions, homework exercises, and progress notes.
          </p>
        </div>
        <Link href="/client/appointments?new=1">
          <Button icon={<Plus className="size-3.5" />}>Book a session</Button>
        </Link>
      </div>

      {q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : (
        <>
          <Card
            hover={false}
            variant="burgundy"
            className="mb-6 overflow-hidden p-6 text-white shadow-glow"
          >
            {!d ? (
              <Skeleton className="h-20 bg-white/20 rounded-xl" />
            ) : d.next ? (
              <div className="flex flex-wrap items-center justify-between gap-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                      Next Confirmed Session
                    </span>
                    {d.next.status === "live" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FFDBDF] px-2.5 py-0.5 text-[10px] font-black text-[#9F1239]">
                        <Radio className="size-3 animate-pulse" /> LIVE NOW
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-2xl font-black text-white sm:text-3xl">
                    {fmtDateTime(d.next.start)}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs font-medium text-white/85">
                    <span>{d.next.therapistName}</span>
                    <span>•</span>
                    <span>{modeLabel[d.next.mode]}</span>
                    <span>•</span>
                    <span>{d.next.duration} minutes</span>
                  </div>
                </div>
                <Link href={`/client/session/${d.next.id}`}>
                  <Button
                    variant="soft"
                    size="lg"
                    icon={<Video className="size-4" />}
                    className="bg-white text-[#71102F] shadow-pop hover:bg-[#FDECF1]"
                  >
                    {d.next.status === "live" ? "Join session now" : "Open session room"}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xl font-black text-white">No session currently scheduled</div>
                  <div className="mt-1 text-xs text-white/80">
                    Stay on track with your wellness journey by scheduling your next appointment.
                  </div>
                </div>
                <Link href="/client/appointments?new=1">
                  <Button
                    variant="soft"
                    size="lg"
                    className="bg-white text-[#71102F] shadow-pop hover:bg-[#FDECF1]"
                  >
                    Book appointment now
                  </Button>
                </Link>
              </div>
            )}
          </Card>

          <StaggerGrid className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {!d ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[120px] rounded-[18px]" />
              ))
            ) : (
              <>
                <StatCard
                  tone="mint"
                  label="Sessions Completed"
                  value={d.stats.completed}
                  delta="Therapy milestones achieved"
                  up={true}
                  icon={<CalendarCheck className="size-4.5" />}
                />
                <StatCard
                  tone="lavender"
                  label="Pending Care Tasks"
                  value={d.stats.openTasks}
                  delta="Assigned homework exercises"
                  up={d.stats.openTasks === 0}
                  icon={<ClipboardList className="size-4.5" />}
                />
                <StatCard
                  tone="coral"
                  label="Amount Due"
                  value={money(d.stats.dueAmount)}
                  delta={d.stats.dueAmount === 0 ? "All settled" : "Awaiting payment"}
                  up={d.stats.dueAmount === 0}
                  icon={<CreditCard className="size-4.5" />}
                />
                <StatCard
                  tone="blue"
                  label="Care Team"
                  value={`${d.stats.therapists} clinician${d.stats.therapists === 1 ? "" : "s"}`}
                  delta="Connected therapists"
                  up={true}
                  icon={<Users className="size-4.5" />}
                />
              </>
            )}
          </StaggerGrid>

          <SectionCard
            className="mt-6"
            title="Upcoming Sessions"
            subtitle="Your scheduled appointments"
            action={
              <Link
                href="/client/appointments"
                className="text-xs font-extrabold text-[#98143F] transition-colors hover:underline"
              >
                View all ({d?.upcoming.length ?? 0})
              </Link>
            }
          >
            {!d ? (
              <Skeleton className="h-28 rounded-xl" />
            ) : d.upcoming.length ? (
              <div className="grid gap-2.5 md:grid-cols-2">
                {d.upcoming.map((a) => (
                  <SessionRow key={a.id} a={a} role="client" who={a.therapistName} />
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-xs text-[#888188]">
                No upcoming sessions found. Click &apos;Book a session&apos; to schedule.
              </p>
            )}
          </SectionCard>
        </>
      )}
    </>
  );
}
