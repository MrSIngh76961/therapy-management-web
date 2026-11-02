"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type MenuItem = {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
  hidden?: boolean;
  disabled?: boolean;
};

export function Dropdown({
  trigger,
  items,
  align = "right",
  label = "Open menu",
}: {
  trigger: React.ReactNode;
  items: MenuItem[];
  align?: "left" | "right";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", click);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  const visible = items.filter((i) => !i.hidden);

  return (
    <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="rounded-[12px] outline-none"
      >
        {trigger}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "absolute z-40 mt-1.5 min-w-[200px] rounded-[16px] border border-[#EDE4E8] bg-white/95 p-1.5 shadow-pop backdrop-blur-md",
              align === "right" ? "right-0" : "left-0",
            )}
          >
            {visible.map((i) => (
              <button
                key={i.label}
                role="menuitem"
                disabled={i.disabled}
                onClick={() => {
                  setOpen(false);
                  i.onSelect();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-xs font-semibold transition-all duration-150 disabled:opacity-40",
                  i.danger
                    ? "text-[#9F1239] hover:bg-[#FFDBDF]"
                    : "text-[#3F393D] hover:bg-[#F4DCE6] hover:text-[#71102F]",
                )}
              >
                {i.icon && <span className="size-4 shrink-0">{i.icon}</span>}
                <span>{i.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
