"use client";
import { CalendarClock, CreditCard, IndianRupee, Percent, Plus, Stethoscope, TriangleAlert, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, ListItem, SectionCard, StatCard, StatusBadge } from "@/components/ui/card";
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
      <PageHeader eyebrow="Overview" title="Good day, Dr. Rao" subtitle="Here is what is happening across your clinic over the last 30 days." actions={<><Button variant="outline" onClick={() => router.push("/admin/reports")}>View reports</Button><Button icon={<Plus className="size-3.5" />} onClick={() => router.push("/admin/appointments?new=1")}>New appointment</Button></>} />
      {a.isError ? <ErrorState onRetry={() => a.refetch()} /> : (
        <>
          <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {a.isLoading || !a.data ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[100px] rounded-[17px]" />) : <>
              <StatCard label="Revenue collected" value={money(a.data.totals.revenue)} delta="Paid payments" icon={<IndianRupee className="size-4" />} />
              <StatCard label="Appointments" value={a.data.totals.appointments} delta={`${a.data.totals.completionRate}% completion rate`} icon={<CalendarClock className="size-4" />} />
              <StatCard label="Pending payments" value={money(a.data.totals.pending)} delta={`${a.data.totals.overdueInvoices} overdue invoices`} up={false} icon={<CreditCard className="size-4" />} />
              <StatCard label="Active clients" value={a.data.totals.activeClients} delta={`${a.data.totals.activeTherapists} active therapists`} icon={<Users className="size-4" />} />
            </>}
          </StaggerGrid>
          <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <SectionCard title="Revenue trend">{a.data ? <TrendChart data={a.data.series} xKey="label" yKey="revenue" currency /> : <Skeleton className="h-60" />}</SectionCard>
            <SectionCard title="Appointment status">{a.data ? <DonutChart data={a.data.byStatus} /> : <Skeleton className="h-60" />}</SectionCard>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
            <SectionCard title="Upcoming appointments" action={<Link href="/admin/appointments" className="text-[11px] font-bold text-wine">View all</Link>} className="xl:col-span-1">
              {upcoming.isLoading ? <CardSkeleton rows={4} /> : upcoming.isError ? <ErrorState onRetry={() => upcoming.refetch()} /> : (
                <div className="flex flex-col gap-2">
                  {upcoming.data?.slice(0, 5).map((ap) => (
                    <ListItem key={ap.id} onClick={() => router.push(`/admin/appointments?view=${ap.id}`)}>
                      <Avatar name={ap.clientName} size={32} />
                      <div className="min-w-0 flex-1"><div className="truncate text-xs font-bold">{ap.clientName}</div><div className="truncate text-[10px] text-muted">{ap.therapistName} · {fmtDateTime(ap.start)}</div></div>
                      <StatusBadge status={ap.status} />
                    </ListItem>
                  ))}
                </div>
              )}
            </SectionCard>
            <SectionCard title="Therapist activity">{a.data ? <BarsChart data={a.data.byTherapist} xKey="name" bars={[{ key: "sessions", name: "Sessions" }]} height={230} /> : <Skeleton className="h-56" />}</SectionCard>
            <SectionCard title="Needs attention">
              <div className="flex flex-col gap-2">
                <ListItem onClick={() => router.push("/admin/therapists?status=pending")}>
                  <span className="grid size-8 place-items-center rounded-lg bg-[#fff6df] text-warn"><Stethoscope className="size-4" /></span>
                  <div className="flex-1 text-xs"><b>{pending.data?.length ?? "…"} therapist approval{pending.data?.length === 1 ? "" : "s"}</b><div className="text-[10px] text-muted">Credentials awaiting review</div></div>
                </ListItem>
                <ListItem onClick={() => router.push("/admin/invoices?status=overdue")}>
                  <span className="grid size-8 place-items-center rounded-lg bg-[#fdecee] text-bad"><TriangleAlert className="size-4" /></span>
                  <div className="flex-1 text-xs"><b>{a.data?.totals.overdueInvoices ?? "…"} overdue invoices</b><div className="text-[10px] text-muted">Send reminders to clients</div></div>
                </ListItem>
                <ListItem onClick={() => router.push("/admin/payments?status=pending")}>
                  <span className="grid size-8 place-items-center rounded-lg bg-rose text-wine"><Percent className="size-4" /></span>
                  <div className="flex-1 text-xs"><b>{a.data ? money(a.data.totals.pending) : "…"} pending</b><div className="text-[10px] text-muted">Payments not yet collected</div></div>
                </ListItem>
              </div>
            </SectionCard>
          </div>
        </>
      )}
    </>
  );
}
