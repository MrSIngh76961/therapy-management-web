"use client";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "soft" | "outline" | "danger" | "ghost";
const variants: Record<ButtonVariant, string> = {
  primary: "bg-wine text-white hover:shadow-[0_8px_20px_#86163740]",
  soft: "bg-rose text-wine hover:bg-rose-2/60",
  outline: "bg-white border border-line text-[#555] hover:border-[#d9bbc4] hover:text-wine",
  danger: "bg-[#fff0f1] text-bad hover:bg-[#fde1e4]",
  ghost: "bg-transparent text-[#555] hover:bg-rose hover:text-wine",
};
const sizes = { sm: "px-2.5 py-1.5 text-[11px]", md: "px-3.5 py-2.5 text-xs", lg: "px-5 py-3 text-sm" };

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
      whileHover={off ? undefined : { y: -2 }}
      whileTap={off ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-[10px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-55",
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

export function IconButton({ label, children, className, ...rest }: HTMLMotionProps<"button"> & { label: string }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.93 }}
      className={cn("grid size-8 place-items-center rounded-lg bg-[#f3eeee] text-[#666] transition-colors hover:bg-rose hover:text-wine", className)}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
