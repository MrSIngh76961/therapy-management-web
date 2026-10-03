"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldValues, type DefaultValues } from "react-hook-form";
import type { ZodType } from "zod";
import { Button } from "./button";
import { Input, Select, Textarea, Checkbox } from "./form";
import { cn } from "@/lib/cn";

export type FieldDef = {
  name: string; label: string; type?: "text" | "email" | "tel" | "number" | "date" | "datetime-local" | "time" | "select" | "textarea" | "checkbox" | "password";
  options?: { value: string; label: string }[]; placeholder?: string; hint?: string; span?: 1 | 2; min?: number; step?: number;
};

interface Props<V extends FieldValues> {
  fields: FieldDef[]; schema: ZodType<V, unknown> | ZodType; defaultValues: DefaultValues<V>; onSubmit: (v: V) => void | Promise<void>;
  submitLabel?: string; onCancel?: () => void; id?: string; hideActions?: boolean; busy?: boolean;
}

/** Schema-driven form (React Hook Form + Zod). Used by every create/edit dialog and drawer. */
export function EntityForm<V extends FieldValues>({ fields, schema, defaultValues, onSubmit, submitLabel = "Save", onCancel, id, hideActions, busy }: Props<V>) {
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<V>({ resolver: zodResolver(schema as never), defaultValues, mode: "onTouched" });
  return (
    <form id={id} noValidate onSubmit={handleSubmit(async (v) => { await onSubmit(v); })} className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
      {fields.map((f) => {
        const err = (errors as Record<string, { message?: string }>)[f.name]?.message;
        const common = { label: f.label, error: err, fieldClassName: cn(f.span === 2 || f.type === "textarea" ? "sm:col-span-2" : "") };
        const reg = register(f.name as never, f.type === "number" ? { valueAsNumber: true } : undefined);
        if (f.type === "select") return <Select key={f.name} {...common} {...reg} options={f.options ?? []} placeholder="Select…" />;
        if (f.type === "textarea") return <Textarea key={f.name} {...common} {...reg} placeholder={f.placeholder} hint={f.hint} />;
        if (f.type === "checkbox") return <div key={f.name} className="sm:col-span-2"><Checkbox checked={!!watch(f.name as never)} onChange={(v) => setValue(f.name as never, v as never, { shouldDirty: true })} label={f.label} /></div>;
        return <Input key={f.name} {...common} {...reg} type={f.type ?? "text"} placeholder={f.placeholder} hint={f.hint} min={f.min} step={f.step} />;
      })}
      {!hideActions && (
        <div className="flex justify-end gap-2 pt-1 sm:col-span-2">
          {onCancel && <Button variant="outline" onClick={onCancel}>Cancel</Button>}
          <Button type="submit" loading={isSubmitting || busy}>{submitLabel}</Button>
        </div>
      )}
    </form>
  );
}
