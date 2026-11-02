"use client";
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  IndianRupee,
  Percent,
  Plus,
  Sparkles,
  Stethoscope,
  TrendingUp,
  TriangleAlert,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, Card, ListItem, SectionCard, StatCard, StatusBadge } from "@/components/ui/card";
import { BarsChart, DonutChart, TrendChart } from "@/components/ui/charts";
import { CardSkeleton, ErrorState, Skeleton } from "@/components/ui/feedback";
import { PageHeader, StaggerGrid } from "@/components/ui/page-header";
import { useApiQuery, useList } from "@/hooks/useResource";
import { fmtDateTime, money } from "@/lib/format";
import type { Analytics } from "./analytics-types";

export function AdminDashboard() {
  const router = useRouter();
  const a = useApiQuery<Analytics>(["analytics", "dash"], "/analytics", { range: 30 });
  const upcoming = useList("appointments", { scope: "upcoming", sort: "start", dir: "asc" });
  const pending = useList("therapists", { status: "pending" });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-[#EBC3D3] bg-gradient-to-r from-white via-[#FFF8FA] to-[#FFF4F7] p-5 shadow-card sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F4DCE6] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#98143F]">
              <Sparkles className="size-3" />
              Clinic Overview
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#D0F3E5] px-2.5 py-0.5 text-[10px] font-extrabold text-[#065F46]">
              <span className="size-1.5 rounded-full bg-[#0D7A55] animate-pulse" />
              Live Clinic Operations
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#1F191D] sm:text-3xl">
            Good day, Dr. Kavita Rao
          </h1>
          <p className="mt-1 text-xs text-[#6E686F]">
            Here is what is happening across your clinic practice over the last 30 days.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="outline" onClick={() => router.push("/admin/reports")}>
            View detailed reports
          </Button>
          <Button icon={<Plus className="size-3.5" />} onClick={() => router.push("/admin/appointments?new=1")}>
            New appointment
          </Button>
        </div>
      </div>

      {a.isError ? (
        <ErrorState onRetry={() => a.refetch()} />
      ) : (
        <>
          <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {a.isLoading || !a.data ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[120px] rounded-[18px]" />
              ))
            ) : (
              <>
                <StatCard
                  tone="wine"
                  label="Total Revenue Collected"
                  value={money(a.data.totals.revenue)}
                  delta="Paid payments (30d)"
                  up={true}
                  icon={<IndianRupee className="size-4.5" />}
                />
                <StatCard
                  tone="blue"
                  label="Booked Appointments"
                  value={a.data.totals.appointments}
                  delta={`${a.data.totals.completionRate}% completion rate`}
                  up={a.data.totals.completionRate >= 70}
                  icon={<CalendarClock className="size-4.5" />}
                />
                <StatCard
                  tone="coral"
                  label="Pending Dues"
                  value={money(a.data.totals.pending)}
                  delta={`${a.data.totals.overdueInvoices} overdue invoices`}
                  up={false}
                  icon={<CreditCard className="size-4.5" />}
                />
                <StatCard
                  tone="mint"
                  label="Active Practice Clients"
                  value={a.data.totals.activeClients}
                  delta={`${a.data.totals.activeTherapists} therapists active`}
                  up={true}
                  icon={<Users className="size-4.5" />}
                />
              </>
            )}
          </StaggerGrid>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
            <SectionCard
              variant="ivory"
              title="Revenue Trajectory"
              subtitle="Daily collections & financial growth (INR)"
              action={
                <Link
                  href="/admin/reports"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#98143F] transition-colors hover:underline"
                >
                  Full breakdown <ChevronRight className="size-3" />
                </Link>
              }
            >
              {a.data ? (
                <TrendChart data={a.data.series} xKey="label" yKey="revenue" currency height={250} />
              ) : (
                <Skeleton className="h-64 rounded-xl" />
              )}
            </SectionCard>

            <SectionCard
              variant="ivory"
              title="Appointment Status Distribution"
              subtitle="Breakdown of completed vs scheduled"
            >
              {a.data ? (
                <DonutChart data={a.data.byStatus} height={250} />
              ) : (
                <Skeleton className="h-64 rounded-xl" />
              )}
            </SectionCard>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_1fr_1fr]">
            <SectionCard
              title="Upcoming Appointments"
              subtitle="Next confirmed clinical bookings"
              action={
                <Link
                  href="/admin/appointments"
                  className="text-xs font-extrabold text-[#98143F] transition-colors hover:underline"
                >
                  View all ({upcoming.data?.length ?? 0})
                </Link>
              }
            >
              {upcoming.isLoading ? (
                <CardSkeleton rows={4} />
              ) : upcoming.isError ? (
                <ErrorState onRetry={() => upcoming.refetch()} />
              ) : upcoming.data?.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#888188]">No upcoming sessions scheduled.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {upcoming.data?.slice(0, 5).map((ap) => (
                    <ListItem
                      key={ap.id}
                      onClick={() => router.push(`/admin/appointments?view=${ap.id}`)}
                      className="justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={ap.clientName} size={34} />
                        <div className="min-w-0">
                          <div className="truncate text-xs font-black text-[#1F191D]">
                            {ap.clientName}
                          </div>
                          <div className="truncate text-[10px] text-[#6E686F]">
                            {ap.therapistName} · {fmtDateTime(ap.start)}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={ap.status} />
                    </ListItem>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Therapist Session Activity"
              subtitle="Sessions completed per clinician"
            >
              {a.data ? (
                <BarsChart
                  data={a.data.byTherapist}
                  xKey="name"
                  bars={[{ key: "sessions", name: "Sessions" }]}
                  height={230}
                />
              ) : (
                <Skeleton className="h-56 rounded-xl" />
              )}
            </SectionCard>

            <SectionCard
              title="Priority Attention"
              subtitle="Items requiring clinic owner review"
            >
              <div className="flex flex-col gap-2.5">
                <Card
                  variant="coral"
                  hover={true}
                  onClick={() => router.push("/admin/invoices?status=overdue")}
                  className="flex items-center gap-3 p-3.5"
                >
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#E11D48] to-[#9F1239] text-white shadow-xs">
                    <TriangleAlert className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black text-[#9F1239]">
                      {a.data?.totals.overdueInvoices ?? 0} Overdue Invoices
                    </div>
                    <div className="text-[10px] text-[#6E686F]">
                      Reminders ready to be dispatched
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-[#9F1239]/60" />
                </Card>

                <Card
                  variant="ivory"
                  hover={true}
                  onClick={() => router.push("/admin/therapists?status=pending")}
                  className="flex items-center gap-3 p-3.5"
                >
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#D97706] to-[#B45309] text-white shadow-xs">
                    <Stethoscope className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black text-[#92400E]">
                      {pending.data?.length ?? 0} Therapist Approval{(pending.data?.length ?? 0) === 1 ? "" : "s"}
                    </div>
                    <div className="text-[10px] text-[#6E686F]">
                      Credentials awaiting RCI verification
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-[#92400E]/60" />
                </Card>

                <Card
                  variant="rose"
                  hover={true}
                  onClick={() => router.push("/admin/payments?status=pending")}
                  className="flex items-center gap-3 p-3.5"
                >
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#98143F] to-[#71102F] text-white shadow-xs">
                    <Percent className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black text-[#71102F]">
                      {a.data ? money(a.data.totals.pending) : "…"} Pending Collection
                    </div>
                    <div className="text-[10px] text-[#6E686F]">
                      Invoices awaiting client payment
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-[#71102F]/60" />
                </Card>
              </div>
            </SectionCard>
          </div>
        </>
      )}
    </>
  );
}
