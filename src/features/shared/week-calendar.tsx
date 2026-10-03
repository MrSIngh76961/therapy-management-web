"use client";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { fmtTime } from "@/lib/format";
import type { Appointment } from "@/services/types";

const dot: Record<string, string> = { completed: "border-ok bg-[#e9f7f0] text-[#287456]", cancelled: "border-bad bg-[#fdecee] text-[#a72c42]", no_show: "border-bad bg-[#fdecee] text-[#a72c42]", live: "border-wine bg-rose text-wine", joined: "border-ok bg-[#e9f7f0] text-[#287456]" };

export function weekStart(d: Date) {
  const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x;
}

export function WeekCalendar({ items, onSelect, who }: { items: Appointment[]; onSelect: (a: Appointment) => void; who: "client" | "therapist" }) {
  const [start, setStart] = useState(() => weekStart(new Date()));
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; }), [start]);
  const shift = (n: number) => setStart((s) => { const d = new Date(s); d.setDate(d.getDate() + n * 7); return d; });
  const today = new Date().toDateString();
  const label = `${days[0].toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${days[6].toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
  return (
    <div>
      <div className="flex items-center justify-between gap-2 border-b border-line p-3">
        <div className="text-xs font-extrabold">{label}</div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" aria-label="Previous week" onClick={() => shift(-1)}><ChevronLeft className="size-3.5" /></Button>
          <Button variant="outline" size="sm" onClick={() => setStart(weekStart(new Date()))}>Today</Button>
          <Button variant="outline" size="sm" aria-label="Next week" onClick={() => shift(1)}><ChevronRight className="size-3.5" /></Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-7">
        {days.map((d, i) => {
          const list = items.filter((a) => new Date(a.start).toDateString() === d.toDateString()).sort((a, b) => a.start.localeCompare(b.start));
          const isToday = d.toDateString() === today;
          return (
            <div key={i} className={cn("min-h-[110px] border-b border-line p-2 md:min-h-[260px] md:border-b-0 md:border-r md:last:border-r-0", isToday && "bg-[#fffafb]")}>
              <div className="mb-2 flex items-center gap-2 md:block md:text-center">
                <div className="text-[10px] font-semibold uppercase text-muted">{d.toLocaleDateString("en-IN", { weekday: "short" })}</div>
                <div className={cn("grid size-7 place-items-center rounded-full text-xs font-extrabold md:mx-auto", isToday && "bg-wine text-white")}>{d.getDate()}</div>
              </div>
              <div className="space-y-1.5">
                {list.length === 0 && <div className="hidden text-center text-[10px] text-[#c4bdc0] md:block">—</div>}
                {list.map((a) => (
                  <motion.button key={a.id} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => onSelect(a)} className={cn("w-full rounded-lg border-l-[3px] px-2 py-1.5 text-left text-[10px] shadow-sm", dot[a.status] ?? "border-info bg-[#edf3fc] text-[#41679d]")}>
                    <div className="font-extrabold">{fmtTime(a.start)}</div>
                    <div className="truncate">{who === "client" ? a.clientName : a.therapistName}</div>
                  </motion.button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}