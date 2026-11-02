"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { stagger } from "@/lib/motion";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  back,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 flex-1">
        {back && (
          <Link
            href={back.href}
            className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-[#6E686F] transition-colors hover:text-[#98143F]"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to {back.label}</span>
          </Link>
        )}
        {eyebrow && (
          <div className="inline-flex items-center rounded-full bg-[#F4DCE6] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#98143F]">
            {eyebrow}
          </div>
        )}
        <h1 className="mt-1.5 text-2xl font-black tracking-[-0.03em] text-[#1F191D] sm:text-3xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1 max-w-2xl text-xs text-[#6E686F]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

export function StaggerGrid({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className={className}>
      {children}
    </motion.div>
  );
}

export { ChevronRight };
