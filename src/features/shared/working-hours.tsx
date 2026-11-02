"use client";
import { Clock, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Card, SectionCard } from "@/components/ui/card";
import { CardSkeleton, ErrorState } from "@/components/ui/feedback";
import { Input, Select, Switch } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { useAction, useApiQuery } from "@/hooks/useResource";
import { cn } from "@/lib/cn";
import { fmtDate, uid } from "@/lib/format";
import { api } from "@/services/api";
import type { WorkingHours } from "@/services/types";

const dur = (s: string, e: string) => {
  const [a, b] = s.split(":").map(Number),
    [c, d] = e.split(":").map(Number);
  return c * 60 + d - (a * 60 + b);
};

export function WorkingHoursView() {
  const q = useApiQuery<WorkingHours>(["therapist", "working-hours"], "/therapist/working-hours");
  const save = useAction(
    (v: WorkingHours) => api.put("/therapist/working-hours", v),
    ["therapist"],
  );
  const [d, setD] = useState<WorkingHours | null>(null);
  const [off, setOff] = useState({ date: "", reason: "" });
  const { toast } = useToast();

  useEffect(() => {
    if (q.data) setD(q.data);
  }, [q.data]);

  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!d) return <CardSkeleton rows={6} />;

  const dirty = JSON.stringify(d) !== JSON.stringify(q.data);
  const errors: string[] = [];
  d.days.forEach((day) => {
    if (day.enabled)
      day.slots.forEach((s, i) => {
        if (dur(s.start, s.end) <= 0) errors.push(`${day.day}: slot ${i + 1} must end after it starts`);
      });
  });
  const setDay = (i: number, f: (x: WorkingHours["days"][number]) => WorkingHours["days"][number]) =>
    setD({ ...d, days: d.days.map((x, j) => (j === i ? f(x) : x)) });
  const hours = Math.round(
    d.days.reduce(
      (s, x) => s + (x.enabled ? x.slots.reduce((a, t) => a + Math.max(0, dur(t.start, t.end)), 0) : 0),
      0,
    ) / 60,
  );

  return (
    <>
      <PageHeader
        eyebrow="Clinician Availability"
        title="Working Hours & Weekly Schedule"
        subtitle={`${hours} bookable hours per week. Clients and booking widgets only display slots inside these established windows.`}
        actions={
          <Button
            icon={<Save className="size-3.5" />}
            disabled={!dirty || errors.length > 0}
            loading={save.isPending}
            onClick={async () => {
              try {
                await save.mutateAsync(d);
                toast("Working hours and availability schedule saved");
              } catch {
                toast("Could not save working hours", "error");
              }
            }}
          >
            Save changes
          </Button>
        }
      />
      {errors.length > 0 && (
        <div role="alert" className="mb-5 rounded-[16px] border border-[#F9C2CB] bg-[#FFDBDF] p-4 text-xs font-bold text-[#9F1239]">
          {errors.map((e) => (
            <div key={e}>{e}</div>
          ))}
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <SectionCard variant="ivory" title="Weekly Time Windows">
          <ul className="divide-y divide-[#F0E6EB]">
            {d.days.map((day, i) => (
              <li key={day.day} className="flex flex-wrap items-start gap-4 py-3.5">
                <div className="flex w-36 items-center gap-3 pt-1.5">
                  <Switch
                    label={`${day.day} available`}
                    checked={day.enabled}
                    onChange={(v) =>
                      setDay(i, (x) => ({
                        ...x,
                        enabled: v,
                        slots: v && !x.slots.length ? [{ start: "09:00", end: "17:00" }] : x.slots,
                      }))
                    }
                  />
                  <span className={cn("text-xs font-black", !day.enabled ? "text-[#888188]" : "text-[#1F191D]")}>
                    {day.day}
                  </span>
                </div>
                <div className="flex-1 space-y-2">
                  {!day.enabled ? (
                    <span className="inline-block rounded-md bg-[#FAF7F8] px-2.5 py-1 text-xs font-medium text-[#888188]">
                      Unavailable for bookings
                    </span>
                  ) : (
                    day.slots.map((s, k) => (
                      <div key={k} className="flex items-center gap-2">
                        <input
                          aria-label={`${day.day} start`}
                          type="time"
                          value={s.start}
                          onChange={(e) =>
                            setDay(i, (x) => ({
                              ...x,
                              slots: x.slots.map((t, j) => (j === k ? { ...t, start: e.target.value } : t)),
                            }))
                          }
                          className="rounded-[10px] border border-[#EDE4E8] bg-white px-3 py-1.5 text-xs font-bold text-[#1F191D] shadow-xs"
                        />
                        <span className="text-[#888188]">–</span>
                        <input
                          aria-label={`${day.day} end`}
                          type="time"
                          value={s.end}
                          onChange={(e) =>
                            setDay(i, (x) => ({
                              ...x,
                              slots: x.slots.map((t, j) => (j === k ? { ...t, end: e.target.value } : t)),
                            }))
                          }
                          className="rounded-[10px] border border-[#EDE4E8] bg-white px-3 py-1.5 text-xs font-bold text-[#1F191D] shadow-xs"
                        />
                        <IconButton
                          label="Remove slot"
                          onClick={() =>
                            setDay(i, (x) => {
                              const slots = x.slots.filter((_, j) => j !== k);
                              return { ...x, slots, enabled: slots.length > 0 };
                            })
                          }
                        >
                          <X className="size-3.5" />
                        </IconButton>
                      </div>
                    ))
                  )}
                  {day.enabled && (
                    <button
                      onClick={() =>
                        setDay(i, (x) => ({
                          ...x,
                          slots: [...x.slots, { start: "14:00", end: "18:00" }],
                        }))
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#98143F] hover:underline"
                    >
                      <Plus className="size-3" />
                      Add slot window
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        <div className="space-y-5">
          <SectionCard variant="ivory" title="Session Cadence & Intervals">
            <div className="space-y-3.5">
              <Select
                label="Standard consultation duration"
                value={String(d.slotMinutes)}
                onChange={(e) => setD({ ...d, slotMinutes: Number(e.target.value) })}
                options={[30, 45, 50, 60, 90].map((m) => ({ value: String(m), label: `${m} minutes` }))}
              />
              <Select
                label="Buffer gap between sessions"
                value={String(d.bufferMinutes)}
                onChange={(e) => setD({ ...d, bufferMinutes: Number(e.target.value) })}
                options={[0, 5, 10, 15, 30].map((m) => ({
                  value: String(m),
                  label: m ? `${m} minutes buffer` : "No buffer (back-to-back)",
                }))}
              />
            </div>
          </SectionCard>

          <SectionCard variant="ivory" title="Planned Time Off & Holidays">
            <div className="mb-3 flex gap-2">
              <Input
                label="Date"
                type="date"
                value={off.date}
                onChange={(e) => setOff({ ...off, date: e.target.value })}
              />
              <Input
                label="Reason"
                value={off.reason}
                onChange={(e) => setOff({ ...off, reason: e.target.value })}
                placeholder="e.g. Clinical Conference"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={!off.date}
              icon={<Plus className="size-3" />}
              onClick={() => {
                setD({
                  ...d,
                  timeOff: [
                    ...d.timeOff,
                    { id: uid("to"), date: off.date, reason: off.reason || "Time off" },
                  ].sort((a, b) => a.date.localeCompare(b.date)),
                });
                setOff({ date: "", reason: "" });
              }}
            >
              Add time off block
            </Button>
            <ul className="mt-4 space-y-2">
              {d.timeOff.length === 0 && (
                <li className="rounded-xl border border-dashed border-[#EDE4E8] p-4 text-center text-xs text-[#888188]">
                  No planned time off scheduled.
                </li>
              )}
              {d.timeOff.map((t) => (
                <Card
                  key={t.id}
                  hover={false}
                  className="flex items-center justify-between p-3 text-xs border border-[#EDE4E8] bg-white shadow-xs"
                >
                  <span>
                    <b className="text-[#1F191D]">{fmtDate(t.date)}</b> · {t.reason}
                  </span>
                  <IconButton
                    label="Remove time off"
                    onClick={() =>
                      setD({
                        ...d,
                        timeOff: d.timeOff.filter((x) => x.id !== t.id),
                      })
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </IconButton>
                </Card>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
