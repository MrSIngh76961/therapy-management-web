"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type MenuItem = { label: string; icon?: React.ReactNode; onSelect: () => void; danger?: boolean; hidden?: boolean; disabled?: boolean };
export function Dropdown({ trigger, items, align = "right", label = "Open menu" }: { trigger: React.ReactNode; items: MenuItem[]; align?: "left" | "right"; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", click); document.removeEventListener("keydown", key); };
  }, [open]);
  const visible = items.filter((i) => !i.hidden);
  return (
    <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)} className="rounded-lg">{trigger}</button>
      <AnimatePresence>
        {open && (
          <motion.div role="menu" initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className={cn("absolute z-40 mt-1.5 min-w-[180px] rounded-xl border border-line bg-white p-1.5 shadow-pop", align === "right" ? "right-0" : "left-0")}>
            {visible.map((i) => (
              <button key={i.label} role="menuitem" disabled={i.disabled} onClick={() => { setOpen(false); i.onSelect(); }} className={cn("flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors disabled:opacity-40", i.danger ? "text-bad hover:bg-[#fff0f1]" : "text-[#444] hover:bg-rose hover:text-wine")}>
                {i.icon}{i.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
