"use client";
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { fadeUp } from "@/lib/motion";
import { initials, titleCase } from "@/lib/format";

export function Card({ className, children, hover = true, onClick, ...rest }: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-card border border-line bg-white shadow-card transition-all duration-200",
        hover && "hover:-translate-y-px hover:shadow-card-hover",
        onClick && "cursor-pointer",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function SectionCard({ title, action, children, className, bodyClassName }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <Card className={cn("p-[18px]", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[13px] font-extrabold">{title}</h2>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </Card>
  );
}

export function StatCard({ label, value, delta, up = true, icon }: { label: string; value: React.ReactNode; delta?: string; up?: boolean; icon?: React.ReactNode }) {
  return (
    <motion.div variants={fadeUp}>
      <Card className="p-4">
        <div className="flex items-start justify-between">
          <div className="text-[10px] font-semibold text-[#8b868c]">{label}</div>
          {icon && <div className="grid size-7 place-items-center rounded-lg bg-rose text-wine">{icon}</div>}
        </div>
        <div className="mt-1.5 text-[25px] font-extrabold leading-tight">{value}</div>
        {delta && (
          <div className={cn("mt-1 flex items-center gap-1 text-[10px]", up ? "text-ok" : "text-bad")}>
            {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {delta}
          </div>
        )}
      </Card>
    </motion.div>
  );
}

const tones = {
  gray: "bg-[#f3eeee] text-[#777]",
  green: "bg-[#e9f7f0] text-[#287456]",
  amber: "bg-[#fff6df] text-[#966d1c]",
  blue: "bg-[#edf3fc] text-[#41679d]",
  red: "bg-[#fdecee] text-[#a72c42]",
  wine: "bg-rose text-wine",
} as const;
export type Tone = keyof typeof tones;

const statusTone: Record<string, Tone> = {
  active: "green", paid: "green", completed: "green", provided: "green", registered: "green", confirmed: "green", sent: "green", approved: "green", done: "green", joined: "green", live: "wine", available: "green", delivered: "green",
  pending: "amber", scheduled: "blue", invited: "blue", consent_pending: "amber", unpaid: "amber", partial: "amber", draft: "gray", link_shared: "blue", assigned: "blue", in_progress: "amber", not_registered: "gray", reviewing: "amber",
  newly_added: "wine", failed: "red", overdue: "red", cancelled: "red", suspended: "red", withdrawn: "red", no_show: "red", void: "red", inactive: "gray", archived: "gray", consent_provided: "green", expired: "red",
};
export function Badge({ tone, children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-extrabold", tones[tone ?? "gray"], className)}>{children}</span>;
}
const statusLabels: Record<string, string> = {
  joined: "Session joined", live: "Live now", link_shared: "Session link shared", consent_pending: "Consent pending", consent_provided: "Consent provided",
  not_registered: "Not yet registered", registered: "Registered", invited: "Invited", newly_added: "Newly added", no_show: "No-show",
};
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <Badge tone={statusTone[status] ?? "gray"}>{label ?? statusLabels[status] ?? titleCase(status)}</Badge>;
}

export function Avatar({ name, size = 36, className }: { name: string; size?: number; className?: string }) {
  return (
    <div style={{ width: size, height: size, fontSize: Math.max(9, size / 3.4) }} className={cn("grid shrink-0 place-items-center rounded-full bg-rose-2 font-extrabold text-wine", className)} aria-hidden>
      {initials(name)}
    </div>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-[7px] overflow-hidden rounded-full bg-[#eee]", className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <motion.i initial={{ width: 0 }} animate={{ width: `${Math.min(100, value)}%` }} transition={{ duration: 0.6 }} className="block h-full rounded-full bg-gradient-to-r from-wine to-[#d45a7b]" />
    </div>
  );
}

export function ListItem({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  const cls = cn("flex w-full items-center gap-2.5 rounded-xl border border-[#eee7e8] p-[11px] text-left transition-all duration-200 hover:translate-x-0.5 hover:border-[#d9bbc4] hover:bg-[#fffafa]", className);
  return onClick ? <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onClick(); } }} className={cn(cls, "cursor-pointer")}>{children}</div> : <div className={cls}>{children}</div>;
}

export function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[#999]">{label}</div>
      <div className="mt-0.5 break-words text-xs font-semibold">{children}</div>
    </div>
  );
}

