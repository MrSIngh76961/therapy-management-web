"use client";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "soft" | "outline" | "danger" | "ghost";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-[#98143F] via-[#861237] to-[#71102F] text-white shadow-[0_4px_14px_rgba(152,20,63,0.3)] hover:shadow-[0_8px_22px_-2px_rgba(152,20,63,0.42)] hover:brightness-105 active:brightness-95",
  soft:
    "bg-[#F4DCE6] text-[#71102F] border border-[#EBC3D3] hover:bg-[#EBD0DC] active:bg-[#E2BFCE]",
  outline:
    "bg-white/95 border border-[#EDE4E8] text-[#3F393D] shadow-sm hover:border-[#98143F]/40 hover:bg-[#FFF3EF] hover:text-[#98143F]",
  danger:
    "bg-[#FFDBDF] text-[#9F1239] border border-[#F9C2CB] hover:bg-[#F9C2CB] active:bg-[#F8BAC4]",
  ghost:
    "bg-transparent text-[#554F54] hover:bg-[#F4DCE6] hover:text-[#98143F]",
};

const sizes = {
  sm: "px-3 py-1.5 text-[11px] rounded-[10px]",
  md: "px-4 py-2 text-xs rounded-[12px]",
  lg: "px-5 py-2.5 text-sm rounded-[14px]",
};

type Props = Omit<HTMLMotionProps<"button">, "children"> & {
  variant?: ButtonVariant;
  size?: keyof typeof sizes;
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", loading, icon, className, children, disabled, type = "button", ...rest },
  ref,
) {
  const off = disabled || loading;
  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={off}
      whileHover={off ? undefined : { y: -1 }}
      whileTap={off ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-bold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 select-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : icon}
      {children}
    </motion.button>
  );
});

export function IconButton({
  label,
  children,
  className,
  ...rest
}: HTMLMotionProps<"button"> & { label: string }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      whileHover={{ scale: 1.05, y: -1 }}
      whileTap={{ scale: 0.94 }}
      transition={{ duration: 0.12 }}
      className={cn(
        "grid size-8 place-items-center rounded-xl border border-[#EDE4E8] bg-white text-[#6E686F] shadow-sm transition-colors hover:border-[#98143F]/40 hover:bg-[#F4DCE6] hover:text-[#98143F]",
        className,
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
