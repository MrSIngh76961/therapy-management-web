"use client";
import { motion } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight, Clock, Mic, Video } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { fmtTime } from "@/lib/format";
import type { Appointment } from "@/services/types";

const statusStyle: Record<string, { border: string; bg: string; text: string }> = {
  completed: { border: "border-ok", bg: "bg-mint/80", text: "text-ok" },
  cancelled: { border: "border-bad", bg: "bg-coral/80", text: "text-bad" },
  no_show: { border: "border-bad", bg: "bg-coral/80", text: "text-bad" },
  live: { border: "border-wine", bg: "bg-rose", text: "text-wine" },
  joined: { border: "border-ok", bg: "bg-mint/80", text: "text-ok" },
  scheduled: { border: "border-info", bg: "bg-soft-blue/80", text: "text-info" },
  link_shared: { border: "border-wine", bg: "bg-rose/80", text: "text-wine" },
};

export function weekStart(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export function WeekCalendar({
  items,
  onSelect,
  who,
}: {
  items: Appointment[];
  onSelect: (a: Appointment) => void;
  who: "client" | "therapist";
}) {
  const [start, setStart] = useState(() => weekStart(new Date()));
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [start]
  );
  const shift = (n: number) =>
    setStart((s) => {
      const d = new Date(s);
      d.setDate(d.getDate() + n * 7);
      return d;
    });
  const today = new Date().toDateString();
  const label = `${days[0].toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })} – ${days[6].toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-warm-ivory/65 p-4">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-rose text-wine">
            <Calendar className="size-4" />
          </div>
          <span className="text-sm font-extrabold text-ink">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" aria-label="Previous week" onClick={() => shift(-1)}>
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setStart(weekStart(new Date()))}>
            Current Week
          </Button>
          <Button variant="outline" size="sm" aria-label="Next week" onClick={() => shift(1)}>
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 divide-y md:grid-cols-7 md:divide-x md:divide-y-0 divide-line">
        {days.map((d, i) => {
          const list = items
            .filter((a) => new Date(a.start).toDateString() === d.toDateString())
            .sort((a, b) => a.start.localeCompare(b.start));
          const isToday = d.toDateString() === today;

          return (
            <div
              key={i}
              className={cn(
                "min-h-[120px] p-2.5 transition-colors md:min-h-[280px]",
                isToday ? "bg-gradient-to-b from-rose/30 to-warm-ivory/40" : "bg-white"
              )}
            >
              {/* Day header */}
              <div className="mb-2.5 flex items-center justify-between gap-2 md:flex-col md:text-center">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  {d.toLocaleDateString("en-IN", { weekday: "short" })}
                </div>
                <div
                  className={cn(
                    "grid size-7 place-items-center rounded-full text-xs font-black transition-all",
                    isToday ? "bg-wine text-white shadow-xs" : "text-ink"
                  )}
                >
                  {d.getDate()}
                </div>
              </div>

              {/* Day sessions */}
              <div className="space-y-2">
                {list.length === 0 && (
                  <div className="hidden py-4 text-center text-[10px] font-semibold text-muted/60 md:block">
                    No sessions
                  </div>
                )}
                {list.map((a) => {
                  const style = statusStyle[a.status] || {
                    border: "border-info",
                    bg: "bg-soft-blue/80",
                    text: "text-info",
                  };
                  return (
                    <motion.button
                      key={a.id}
                      whileHover={{ y: -2, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onSelect(a)}
                      className={cn(
                        "w-full rounded-xl border-l-[3px] p-2 text-left text-[11px] shadow-xs transition-shadow hover:shadow-md",
                        style.border,
                        style.bg
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn("font-extrabold", style.text)}>{fmtTime(a.start)}</span>
                        {a.mode === "audio" ? (
                          <Mic className="size-3 text-muted" />
                        ) : a.mode === "video" ? (
                          <Video className="size-3 text-muted" />
                        ) : (
                          <Clock className="size-3 text-muted" />
                        )}
                      </div>
                      <div className="mt-0.5 truncate font-bold text-ink">
                        {who === "client" ? a.clientName : a.therapistName}
                      </div>
                      <div className="truncate text-[9px] text-muted">{a.serviceName}</div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
