"use client";
import { AnimatePresence, motion } from "framer-motion";
import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

const base = "w-full rounded-[10px] border border-line bg-white px-3 py-2.5 text-xs outline-none transition-all placeholder:text-[#b3adb0] focus:border-[#c78398] focus:shadow-[0_0_0_3px_var(--color-rose)] disabled:bg-[#faf7f8] disabled:text-muted aria-[invalid=true]:border-bad";

export function Field({ label, error, hint, children, htmlFor, className }: { label?: string; error?: string; hint?: string; children: React.ReactNode; htmlFor?: string; className?: string }) {
  return (
    <div className={className}>
      {label && <label htmlFor={htmlFor} className="mb-1.5 block text-[10px] font-bold text-[#666]">{label}</label>}
      {children}
      <AnimatePresence initial={false}>
        {error ? (
          <motion.p key="e" role="alert" initial={{ opacity: 0, y: -4, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-1 text-[10px] font-semibold text-bad">{error}</motion.p>
        ) : hint ? <p className="mt-1 text-[10px] text-muted">{hint}</p> : null}
      </AnimatePresence>
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; hint?: string; fieldClassName?: string; leading?: React.ReactNode };
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, error, hint, className, fieldClassName, leading, id, ...rest }, ref) {
  const auto = useId();
  const iid = id ?? auto;
  return (
    <Field label={label} error={error} hint={hint} htmlFor={iid} className={fieldClassName}>
      <div className="relative">
        {leading && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9498]">{leading}</span>}
        <input ref={ref} id={iid} aria-invalid={!!error} className={cn(base, leading && "pl-9", className)} {...rest} />
      </div>
    </Field>
  );
});

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string; options: { value: string; label: string }[]; placeholder?: string; fieldClassName?: string };
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, error, options, placeholder, className, fieldClassName, id, ...rest }, ref) {
  const auto = useId();
  const sid = id ?? auto;
  return (
    <Field label={label} error={error} htmlFor={sid} className={fieldClassName}>
      <select ref={ref} id={sid} aria-invalid={!!error} className={cn(base, "appearance-none bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-8 [background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]", className)} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
});

type TAProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string; hint?: string; fieldClassName?: string };
export const Textarea = forwardRef<HTMLTextAreaElement, TAProps>(function Textarea({ label, error, hint, className, fieldClassName, id, ...rest }, ref) {
  const auto = useId();
  const tid = id ?? auto;
  return (
    <Field label={label} error={error} hint={hint} htmlFor={tid} className={fieldClassName}>
      <textarea ref={ref} id={tid} rows={3} aria-invalid={!!error} className={cn(base, "resize-y", className)} {...rest} />
    </Field>
  );
});

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50", checked ? "bg-wine" : "bg-[#ddd3d6]")}>
      <motion.span layout transition={{ type: "spring", stiffness: 500, damping: 32 }} className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow", checked ? "right-0.5" : "left-0.5")} />
    </button>
  );
}

export function Checkbox({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode; disabled?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-xs">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 accent-[#861637]" />
      <span>{label}</span>
    </label>
  );
}
