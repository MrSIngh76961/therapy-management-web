"use client";
import { motion } from "framer-motion";
import { useId } from "react";
import { cn } from "@/lib/cn";

export type TabItem = { id: string; label: string; count?: number };
export function Tabs({ items, value, onChange, className }: { items: TabItem[]; value: string; onChange: (id: string) => void; className?: string }) {
  const group = useId();
  return (
    <div role="tablist" className={cn("scroll-thin flex gap-1 overflow-x-auto rounded-xl border border-line bg-white p-1", className)}>
      {items.map((t) => {
        const active = t.id === value;
        return (
          <button key={t.id} role="tab" aria-selected={active} onClick={() => onChange(t.id)} className={cn("relative whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors", active ? "text-wine" : "text-[#777] hover:text-wine")}>
            {active && <motion.span layoutId={`tab-${group}`} className="absolute inset-0 rounded-lg bg-rose" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
            <span className="relative flex items-center gap-1.5">
              {t.label}
              {t.count !== undefined && <span className="rounded-full bg-white/80 px-1.5 text-[9px] font-extrabold">{t.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
