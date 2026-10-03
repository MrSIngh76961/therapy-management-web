"use client";
import { useState } from "react";
import { Drawer, Modal } from "@/components/ui/overlay";
import { EntityForm, type FieldDef } from "@/components/ui/entity-form";
import { useToast } from "@/components/ui/toast";
import type { FieldValues, DefaultValues } from "react-hook-form";
import type { ZodType } from "zod";

interface Props<V extends FieldValues> {
  open: boolean; onClose: () => void; title: string; description?: string; variant?: "modal" | "drawer";
  fields: FieldDef[]; schema: ZodType; defaultValues: DefaultValues<V>; submitLabel?: string;
  onSubmit: (v: V) => Promise<unknown>; successMessage: string;
}

/** Create/edit surface: handles pending, success toast and API error toast for any EntityForm. */
export function FormDialog<V extends FieldValues>({ open, onClose, title, description, variant = "modal", fields, schema, defaultValues, submitLabel, onSubmit, successMessage }: Props<V>) {
  const { toast } = useToast();
  const [key, setKey] = useState(0);
  const submit = async (v: V) => {
    try { await onSubmit(v); toast(successMessage); onClose(); setKey((k) => k + 1); }
    catch (e) { toast(e instanceof Error ? e.message : "Could not save changes", "error"); }
  };
  const form = open && <EntityForm key={`${key}-${JSON.stringify(defaultValues)}`} fields={fields} schema={schema} defaultValues={defaultValues} onSubmit={submit} onCancel={onClose} submitLabel={submitLabel} />;
  return variant === "drawer"
    ? <Drawer open={open} onClose={onClose} title={title} description={description}>{form}</Drawer>
    : <Modal open={open} onClose={onClose} title={title} description={description}>{form}</Modal>;
}

