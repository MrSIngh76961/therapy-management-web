"use client";
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { fadeUp } from "@/lib/motion";
import { initials, titleCase } from "@/lib/format";

export type CardVariant = "default" | "ivory" | "rose" | "mint" | "lavender" | "blue" | "coral" | "burgundy" | "flat";

const cardVariants: Record<CardVariant, string> = {
  default: "bg-gradient-to-br from-white via-white to-[#FDF3F6] border border-[#EADDE3] shadow-[0_4px_20px_-2px_rgba(113,16,47,0.05),0_2px_6px_-1px_rgba(0,0,0,0.03)]",
  ivory: "bg-gradient-to-br from-[#FFF8F5] to-[#FFEEE8] border border-[#F2DFD8] shadow-card",
  rose: "bg-gradient-to-br from-[#FDECF1] to-[#F4DCE6] border border-[#EBC3D3] shadow-card",
  mint: "bg-gradient-to-br from-[#E6FAF2] to-[#D0F3E5] border border-[#B5E9D5] shadow-card",
  lavender: "bg-gradient-to-br from-[#F3EAFF] to-[#EADCFF] border border-[#DAC2FF] shadow-card",
  blue: "bg-gradient-to-br from-[#EAF3FF] to-[#D8EAFF] border border-[#BFD9FA] shadow-card",
  coral: "bg-gradient-to-br from-[#FFEDEF] to-[#FFDBDF] border border-[#F9C2CB] shadow-card",
  burgundy: "bg-gradient-to-br from-[#98143F] via-[#861237] to-[#71102F] text-white border-0 shadow-[0_12px_32px_-4px_rgba(113,16,47,0.35)]",
  flat: "bg-[#F7F1F3] border border-[#EADDE3]",
};

export function Card({
  className,
  children,
  hover = true,
  variant = "default",
  onClick,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean; variant?: CardVariant }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-[18px] transition-all duration-200",
        cardVariants[variant],
        hover && "hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(113,16,47,0.08),0_4px_10px_rgba(0,0,0,0.03)]",
        onClick && "cursor-pointer",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function SectionCard({
  title,
  subtitle,
  icon,
  action,
  children,
  className,
  bodyClassName,
  variant = "default",
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  variant?: CardVariant;
}) {
  return (
    <Card variant={variant} className={cn("p-5 sm:p-6", className)}>
      {(title || action || icon) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#F4ECF0] pb-3.5">
          <div className="flex items-center gap-2.5">
            {icon && (
              <div className="grid size-8 place-items-center rounded-xl bg-[#F4DCE6] text-[#98143F]">
                {icon}
              </div>
            )}
            <div>
              <h2 className="text-sm font-extrabold tracking-[-0.01em] text-[#1F191D]">{title}</h2>
              {subtitle && <p className="text-[11px] text-[#6E686F]">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </Card>
  );
}

export type StatTone = "wine" | "blue" | "mint" | "lavender" | "coral" | "ivory";

const statThemes: Record<StatTone, { bg: string; border: string; iconBg: string; iconText: string; accentGlow: string }> = {
  wine: {
    bg: "bg-gradient-to-br from-[#FDF1F5] via-[#FAE6EE] to-[#F4DCE6]",
    border: "border-[#EBC6D3]",
    iconBg: "bg-gradient-to-br from-[#98143F] to-[#71102F]",
    iconText: "text-white shadow-[0_4px_12px_rgba(152,20,63,0.28)]",
    accentGlow: "bg-[#98143F]/5",
  },
  blue: {
    bg: "bg-gradient-to-br from-[#F2F8FF] via-[#E6F0FF] to-[#D8EAFF]",
    border: "border-[#C6DDF8]",
    iconBg: "bg-gradient-to-br from-[#2563EB] to-[#1D4ED8]",
    iconText: "text-white shadow-[0_4px_12px_rgba(37,99,235,0.25)]",
    accentGlow: "bg-[#2563EB]/5",
  },
  mint: {
    bg: "bg-gradient-to-br from-[#EFFBF6] via-[#E0F7EE] to-[#D0F3E5]",
    border: "border-[#B8E8D5]",
    iconBg: "bg-gradient-to-br from-[#0D7A55] to-[#065F46]",
    iconText: "text-white shadow-[0_4px_12px_rgba(13,122,85,0.25)]",
    accentGlow: "bg-[#0D7A55]/5",
  },
  lavender: {
    bg: "bg-gradient-to-br from-[#F8F2FF] via-[#F1E7FF] to-[#EADCFF]",
    border: "border-[#D9C4FB]",
    iconBg: "bg-gradient-to-br from-[#7C3AED] to-[#5B21B6]",
    iconText: "text-white shadow-[0_4px_12px_rgba(124,58,237,0.25)]",
    accentGlow: "bg-[#7C3AED]/5",
  },
  coral: {
    bg: "bg-gradient-to-br from-[#FFF2F3] via-[#FFE6E9] to-[#FFDBDF]",
    border: "border-[#F8C3CB]",
    iconBg: "bg-gradient-to-br from-[#E11D48] to-[#9F1239]",
    iconText: "text-white shadow-[0_4px_12px_rgba(225,29,72,0.25)]",
    accentGlow: "bg-[#E11D48]/5",
  },
  ivory: {
    bg: "bg-gradient-to-br from-[#FFF8F5] via-[#FFF2EE] to-[#FFEBE4]",
    border: "border-[#F2DFD8]",
    iconBg: "bg-[#F4DCE6]",
    iconText: "text-[#98143F]",
    accentGlow: "bg-[#98143F]/5",
  },
};

export function StatCard({
  label,
  value,
  delta,
  up = true,
  icon,
  tone = "wine",
}: {
  label: string;
  value: React.ReactNode;
  delta?: string;
  up?: boolean;
  icon?: React.ReactNode;
  tone?: StatTone;
}) {
  const theme = statThemes[tone];
  return (
    <motion.div variants={fadeUp}>
      <div
        className={cn(
          "relative overflow-hidden rounded-[18px] border p-4 sm:p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover",
          theme.bg,
          theme.border,
          "shadow-card",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="text-[11px] font-bold tracking-wide text-[#6E686F]">{label}</div>
          {icon && (
            <div
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-xl",
                theme.iconBg,
                theme.iconText,
              )}
            >
              {icon}
            </div>
          )}
        </div>
        <div className="mt-2 text-[26px] font-black tracking-[-0.03em] text-[#1F191D] sm:text-[28px]">
          {value}
        </div>
        {delta && (
          <div
            className={cn(
              "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
              up
                ? "bg-[#D0F3E5] text-[#065F46]"
                : "bg-[#FFDBDF] text-[#9F1239]",
            )}
          >
            {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            <span>{delta}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

const tones = {
  gray: "bg-[#F3EEEE] text-[#554F54] border border-[#E5DEE1]",
  green: "bg-[#D0F3E5] text-[#065F46] border border-[#BCEBD9]",
  amber: "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]",
  blue: "bg-[#D8EAFF] text-[#1E40AF] border border-[#BFDBFE]",
  red: "bg-[#FFDBDF] text-[#9F1239] border border-[#FECDD3]",
  purple: "bg-[#EADCFF] text-[#5B21B6] border border-[#DDD6FE]",
  wine: "bg-[#F4DCE6] text-[#71102F] border border-[#ECCCD8]",
} as const;

export type Tone = keyof typeof tones;

const statusTone: Record<string, Tone> = {
  active: "green",
  paid: "green",
  completed: "green",
  provided: "green",
  registered: "green",
  confirmed: "green",
  sent: "green",
  approved: "green",
  done: "green",
  joined: "green",
  live: "wine",
  available: "green",
  delivered: "green",
  pending: "amber",
  scheduled: "blue",
  invited: "blue",
  consent_pending: "amber",
  unpaid: "amber",
  partial: "amber",
  draft: "gray",
  link_shared: "blue",
  assigned: "blue",
  in_progress: "amber",
  not_registered: "gray",
  reviewing: "amber",
  newly_added: "purple",
  failed: "red",
  overdue: "red",
  cancelled: "red",
  suspended: "red",
  withdrawn: "red",
  no_show: "red",
  void: "red",
  inactive: "gray",
  archived: "gray",
  consent_provided: "green",
  expired: "red",
};

export function Badge({
  tone = "gray",
  dot = false,
  children,
  className,
}: {
  tone?: Tone;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide",
        tones[tone],
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            "size-1.5 rounded-full",
            tone === "green" && "bg-[#059669]",
            tone === "amber" && "bg-[#D97706]",
            tone === "blue" && "bg-[#2563EB]",
            tone === "red" && "bg-[#E11D48]",
            tone === "purple" && "bg-[#7C3AED]",
            tone === "wine" && "bg-[#98143F] animate-pulse",
            tone === "gray" && "bg-[#71717A]",
          )}
        />
      )}
      {children}
    </span>
  );
}

const statusLabels: Record<string, string> = {
  joined: "Session joined",
  live: "Live now",
  link_shared: "Session link shared",
  consent_pending: "Consent pending",
  consent_provided: "Consent provided",
  not_registered: "Not registered",
  registered: "Registered",
  invited: "Invited",
  newly_added: "Newly added",
  no_show: "No-show",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const tone = statusTone[status] ?? "gray";
  const isLiveOrActive = status === "live" || status === "active" || status === "in_progress";
  return (
    <Badge tone={tone} dot={isLiveOrActive}>
      {label ?? statusLabels[status] ?? titleCase(status)}
    </Badge>
  );
}

const avatarPalettes = [
  "bg-[#F4DCE6] text-[#98143F] ring-[#EBC3D3]",
  "bg-[#D8EAFF] text-[#1E40AF] ring-[#BFD9FA]",
  "bg-[#D0F3E5] text-[#065F46] ring-[#B5E9D5]",
  "bg-[#EADCFF] text-[#6B21A8] ring-[#DAC2FF]",
  "bg-[#FFDBDF] text-[#9F1239] ring-[#F9C2CB]",
];

export function Avatar({
  name,
  size = 36,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const charCode = (name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0);
  const colorClass = avatarPalettes[charCode % avatarPalettes.length];
  return (
    <div
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size / 3.2)) }}
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-black ring-1 transition-transform",
        colorClass,
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div
      className={cn("h-2 overflow-hidden rounded-full bg-[#EDE4E8]", className)}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.i
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="block h-full rounded-full bg-gradient-to-r from-[#98143F] via-[#B81D4F] to-[#71102F]"
      />
    </div>
  );
}

export function ListItem({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const cls = cn(
    "group flex w-full items-center gap-3 rounded-[14px] border border-[#EDE4E8] bg-white/90 p-3 text-left transition-all duration-200",
    "hover:-translate-y-0.5 hover:border-[#DECED5] hover:bg-gradient-to-r hover:from-white hover:to-[#FFF3EF] hover:shadow-[0_4px_16px_rgba(113,16,47,0.06)]",
    className,
  );
  return onClick ? (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(cls, "cursor-pointer")}
    >
      {children}
    </div>
  ) : (
    <div className={cls}>{children}</div>
  );
}

export function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#888188]">{label}</div>
      <div className="mt-0.5 break-words text-xs font-bold text-[#1F191D]">{children}</div>
    </div>
  );
}
