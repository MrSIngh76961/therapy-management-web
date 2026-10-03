"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { stagger } from "@/lib/motion";

export function PageHeader({ eyebrow, title, subtitle, actions, back }: { eyebrow?: string; title: string; subtitle?: string; actions?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {back && <Link href={back.href} className="mb-1 inline-flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-wine">? {back.label}</Link>}
        {eyebrow && <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-wine">{eyebrow}</div>}
        <h1 className="my-1 text-2xl font-extrabold tracking-[-0.04em] sm:text-[28px]">{title}</h1>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StaggerGrid({ className, children }: { className?: string; children: React.ReactNode }) {
  return <motion.div variants={stagger} initial="hidden" animate="show" className={className}>{children}</motion.div>;
}

export { ChevronRight };
