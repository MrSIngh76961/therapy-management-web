"use client";
import { CalendarCheck, Download, IndianRupee, Percent, UserPlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionCard, StatCard } from "@/components/ui/card";
import { BarsChart, DonutChart, TrendChart } from "@/components/ui/charts";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { PageHeader, StaggerGrid } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useApiQuery } from "@/hooks/useResource";
import { money } from "@/lib/format";
import type { Analytics } from "./analytics-types";

export function ReportsPage() {
  const [range, setRange] = useState("30");
  const { toast } = useToast();
  const q = useApiQuery<Analytics>(["analytics", "reports", range], "/analytics", { range: Number(range) });
  const d = q.data;
  const exportCsv = () => {
    if (!d) return;
    const rows = [["Therapist", "Completed sessions", "Revenue"], ...d.byTherapist.map((t) => [t.name, t.sessions, t.revenue])];
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `therapist-report-${range}d.csv`; a.click(); URL.revokeObjectURL(url);
    toast("Report exported");
  };
  return (
    <>
      <PageHeader eyebrow="Insights" title="Reports & Analytics" subtitle="Operational and financial trends across the clinic." actions={<><Tabs value={range} onChange={setRange} items={[{ id: "7", label: "7 days" }, { id: "30", label: "30 days" }, { id: "90", label: "90 days" }]} /><Button variant="outline" icon={<Download className="size-3.5" />} disabled={!d} onClick={exportCsv}>Export CSV</Button></>} />
      {q.isError ? <ErrorState onRetry={() => q.refetch()} /> : (
        <div className="space-y-4">
          <StaggerGrid key={range} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {!d ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[100px] rounded-[17px]" />) : <>
              <StatCard label="Revenue" value={money(d.totals.revenue)} delta={`Pending ${money(d.totals.pending)}`} icon={<IndianRupee className="size-4" />} />
              <StatCard label="Sessions completed" value={d.totals.sessions} delta={`${d.totals.appointments} appointments`} icon={<CalendarCheck className="size-4" />} />
              <StatCard label="Completion rate" value={`${d.totals.completionRate}%`} delta="Completed vs cancelled / no-show" up={d.totals.completionRate >= 70} icon={<Percent className="size-4" />} />
              <StatCard label="New clients" value={d.totals.newClients} delta={`${d.totals.activeClients} active in total`} icon={<UserPlus className="size-4" />} />
            </>}
          </StaggerGrid>
          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard title="Revenue">{d ? <TrendChart data={d.series} xKey="label" yKey="revenue" currency /> : <Skeleton className="h-60" />}</SectionCard>
            <SectionCard title="Appointments vs completed">{d ? <BarsChart data={d.series} xKey="label" bars={[{ key: "appointments", name: "Appointments" }, { key: "completed", name: "Completed" }]} /> : <Skeleton className="h-60" />}</SectionCard>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard title="Appointment status">{d ? (d.byStatus.length ? <DonutChart data={d.byStatus} /> : <EmptyState title="No data" />) : <Skeleton className="h-56" />}</SectionCard>
            <SectionCard title="Payment methods">{d ? (d.byMethod.length ? <DonutChart data={d.byMethod} /> : <EmptyState title="No payments in range" />) : <Skeleton className="h-56" />}</SectionCard>
            <SectionCard title="Client activity">{d ? <DonutChart data={d.clientActivity} /> : <Skeleton className="h-56" />}</SectionCard>
          </div>
          <SectionCard title="Therapist performance">
            {d ? <div className="grid gap-6 lg:grid-cols-2"><BarsChart data={d.byTherapist} xKey="name" bars={[{ key: "sessions", name: "Sessions" }]} /><BarsChart data={d.byTherapist} xKey="name" bars={[{ key: "revenue", name: "Revenue" }]} currency /></div> : <Skeleton className="h-60" />}
          </SectionCard>
        </div>
      )}
    </>
  );
}