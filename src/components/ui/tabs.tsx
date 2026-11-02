"use client";
import { motion } from "framer-motion";
import { useId } from "react";
import { cn } from "@/lib/cn";

export type TabItem = { id: string; label: string; count?: number };

export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const group = useId();
  return (
    <div
      role="tablist"
      className={cn(
        "scroll-thin flex gap-1 overflow-x-auto rounded-[14px] border border-[#EDE4E8] bg-white/90 p-1 shadow-xs backdrop-blur-xs",
        className,
      )}
    >
      {items.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn(
              "relative whitespace-nowrap rounded-[10px] px-3.5 py-1.5 text-xs font-bold transition-colors duration-150 select-none",
              active ? "text-[#71102F]" : "text-[#6E686F] hover:text-[#98143F]",
            )}
          >
            {active && (
              <motion.span
                layoutId={`tab-${group}`}
                className="absolute inset-0 rounded-[10px] border border-[#EBC3D3] bg-[#F4DCE6] shadow-xs"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {t.label}
              {t.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-black",
                    active
                      ? "bg-white text-[#98143F] shadow-xs"
                      : "bg-[#F3EEEE] text-[#6E686F]",
                  )}
                >
                  {t.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
