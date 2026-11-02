"use client";
import { CalendarCheck, Download, IndianRupee, Percent, Sparkles, UserPlus } from "lucide-react";
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
    const rows = [
      ["Therapist", "Completed sessions", "Revenue"],
      ...d.byTherapist.map((t) => [t.name, t.sessions, t.revenue]),
    ];
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `theraflow-analytics-report-${range}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Analytics report exported as CSV");
  };

  return (
    <>
      <PageHeader
        eyebrow="Intelligence & Reports"
        title="Reports & Analytics"
        subtitle="Operational, financial and clinical trends across your entire practice."
        actions={
          <>
            <Tabs
              value={range}
              onChange={setRange}
              items={[
                { id: "7", label: "Last 7 days" },
                { id: "30", label: "Last 30 days" },
                { id: "90", label: "Last 90 days" },
              ]}
            />
            <Button
              variant="outline"
              icon={<Download className="size-3.5" />}
              disabled={!d}
              onClick={exportCsv}
            >
              Export CSV
            </Button>
          </>
        }
      />

      {q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : (
        <div className="space-y-5">
          <StaggerGrid key={range} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {!d ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[120px] rounded-[18px]" />
              ))
            ) : (
              <>
                <StatCard
                  tone="wine"
                  label="Total Collections"
                  value={money(d.totals.revenue)}
                  delta={`Pending uncollected ${money(d.totals.pending)}`}
                  up={true}
                  icon={<IndianRupee className="size-4.5" />}
                />
                <StatCard
                  tone="mint"
                  label="Completed Sessions"
                  value={d.totals.sessions}
                  delta={`Out of ${d.totals.appointments} scheduled`}
                  up={true}
                  icon={<CalendarCheck className="size-4.5" />}
                />
                <StatCard
                  tone="blue"
                  label="Appointment Completion Rate"
                  value={`${d.totals.completionRate}%`}
                  delta="Completed vs cancelled or no-show"
                  up={d.totals.completionRate >= 70}
                  icon={<Percent className="size-4.5" />}
                />
                <StatCard
                  tone="lavender"
                  label="New Patient Intake"
                  value={d.totals.newClients}
                  delta={`${d.totals.activeClients} active clients overall`}
                  up={true}
                  icon={<UserPlus className="size-4.5" />}
                />
              </>
            )}
          </StaggerGrid>

          <div className="grid gap-5 xl:grid-cols-2">
            <SectionCard
              variant="ivory"
              title="Revenue Trajectory (INR)"
              subtitle="Daily earnings over selected time window"
            >
              {d ? (
                <TrendChart data={d.series} xKey="label" yKey="revenue" currency height={250} />
              ) : (
                <Skeleton className="h-64 rounded-xl" />
              )}
            </SectionCard>

            <SectionCard
              variant="ivory"
              title="Booked vs Completed Sessions"
              subtitle="Scheduled appointment completion volume"
            >
              {d ? (
                <BarsChart
                  data={d.series}
                  xKey="label"
                  bars={[
                    { key: "appointments", name: "Scheduled" },
                    { key: "completed", name: "Completed" },
                  ]}
                  height={250}
                />
              ) : (
                <Skeleton className="h-64 rounded-xl" />
              )}
            </SectionCard>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <SectionCard
              variant="ivory"
              title="Appointment Status"
              subtitle="Distribution by status"
            >
              {d ? (
                d.byStatus.length ? (
                  <DonutChart data={d.byStatus} height={230} />
                ) : (
                  <EmptyState title="No status data available" />
                )
              ) : (
                <Skeleton className="h-56 rounded-xl" />
              )}
            </SectionCard>

            <SectionCard
              variant="ivory"
              title="Payment Methods"
              subtitle="Collections by payment channel"
            >
              {d ? (
                d.byMethod.length ? (
                  <DonutChart data={d.byMethod} height={230} />
                ) : (
                  <EmptyState title="No payments in selected range" />
                )
              ) : (
                <Skeleton className="h-56 rounded-xl" />
              )}
            </SectionCard>

            <SectionCard
              variant="ivory"
              title="Client Retention & Activity"
              subtitle="Active vs irregular patient visits"
            >
              {d ? (
                <DonutChart data={d.clientActivity} height={230} />
              ) : (
                <Skeleton className="h-56 rounded-xl" />
              )}
            </SectionCard>
          </div>

          <SectionCard
            variant="ivory"
            title="Clinician Performance & Caseload"
            subtitle="Session volume and generated revenue per therapist"
          >
            {d ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-[#6E686F]">
                    Sessions Handled
                  </h3>
                  <BarsChart
                    data={d.byTherapist}
                    xKey="name"
                    bars={[{ key: "sessions", name: "Sessions" }]}
                    height={220}
                  />
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-[#6E686F]">
                    Revenue Generated (INR)
                  </h3>
                  <BarsChart
                    data={d.byTherapist}
                    xKey="name"
                    bars={[{ key: "revenue", name: "Revenue" }]}
                    currency
                    height={220}
                  />
                </div>
              </div>
            ) : (
              <Skeleton className="h-60 rounded-xl" />
            )}
          </SectionCard>
        </div>
      )}
    </>
  );
}
