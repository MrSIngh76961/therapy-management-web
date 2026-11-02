"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Hash, Plus, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Button, IconButton } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Drawer, Modal } from "@/components/ui/overlay";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { FormDialog } from "@/features/shared/form-dialog";
import { useToast } from "@/components/ui/toast";
import { useAction, useApiQuery, useList } from "@/hooks/useResource";
import { fmtDate, money } from "@/lib/format";
import { api } from "@/services/api";
import type { Invoice, InvoiceSeries } from "@/services/types";
import { Tabs } from "@/components/ui/tabs";

const itemSchema = z.object({
  description: z.string().min(2, "Describe the item"),
  qty: z.number({ message: "Qty" }).min(1),
  rate: z.number({ message: "Rate" }).min(1, "Enter a rate"),
});

const invSchema = z
  .object({
    clientId: z.string().min(1, "Select a client"),
    kind: z.enum(["tax_invoice", "receipt"]),
    issueDate: z.string().min(1, "Required"),
    dueDate: z.string().min(1, "Required"),
    gst: z.number({ message: "GST %" }).min(0).max(28),
    items: z.array(itemSchema).min(1, "Add at least one line item"),
    notes: z.string().optional(),
    status: z.enum(["draft", "sent", "paid"]),
  })
  .refine((v) => v.dueDate >= v.issueDate, {
    path: ["dueDate"],
    message: "Due date cannot be before issue date",
  });

type InvV = z.infer<typeof invSchema>;
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

export function InvoicesPage({
  role = "admin",
  baseParams,
}: {
  role?: "admin" | "therapist";
  baseParams?: Record<string, string>;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [create, setCreate] = useState(false);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [kind, setKind] = useState("all");
  const series = useApiQuery<InvoiceSeries>(["settings", "series"], "/settings/invoice-series");
  const base = `/${role}/invoices`;

  return (
    <>
      <PageHeader
        eyebrow="Financial Operations"
        title="Invoice & Receipt Management"
        subtitle="Issue GST-compliant tax invoices and payment receipts with customizable auto-numbering."
        actions={
          <>
            {role === "admin" && (
              <Button
                variant="outline"
                icon={<Hash className="size-3.5" />}
                onClick={() => setSeriesOpen(true)}
              >
                Numbering series
              </Button>
            )}
            <Button icon={<Plus className="size-3.5" />} onClick={() => setCreate(true)}>
              Create invoice
            </Button>
          </>
        }
      />
      <DataTable
        resource="invoices"
        baseParams={{ ...baseParams, kind: kind === "all" ? undefined : kind }}
        key={kind}
        searchPlaceholder="Search by document number, patient name or clinician…"
        onRowClick={(i) => router.push(`${base}/${i.id}`)}
        defaultSort={{ key: "issueDate", dir: "desc" }}
        initialFilters={sp.get("status") ? { status: sp.get("status") ?? "" } : undefined}
        tabs={
          <Tabs
            value={kind}
            onChange={setKind}
            items={[
              { id: "all", label: "All documents" },
              { id: "tax_invoice", label: "Tax invoices" },
              { id: "receipt", label: "Payment receipts" },
            ]}
          />
        }
        filters={[
          {
            key: "status",
            label: "Document status",
            options: ["draft", "sent", "paid", "overdue", "void"].map((v) => ({
              value: v,
              label: v[0].toUpperCase() + v.slice(1),
            })),
          },
          {
            key: "paymentStatus",
            label: "Payment",
            options: ["paid", "unpaid", "partial"].map((v) => ({
              value: v,
              label: v[0].toUpperCase() + v.slice(1),
            })),
          },
        ]}
        emptyTitle="No invoices or receipts found"
        emptyDescription="Create an invoice or issue a receipt from a successful payment collection."
        emptyAction={<Button onClick={() => setCreate(true)}>Create invoice</Button>}
        columns={[
          {
            key: "no",
            header: "Document No.",
            sortable: true,
            render: (i: Invoice) => (
              <span className="font-extrabold text-[#71102F] hover:underline">{i.no}</span>
            ),
          },
          {
            key: "clientName",
            header: "Billed To",
            sortable: true,
            render: (i: Invoice) => (
              <div>
                <div className="font-extrabold text-[#1F191D]">{i.clientName}</div>
                <div className="text-[10px] text-[#888188]">{i.therapistName}</div>
              </div>
            ),
          },
          {
            key: "kind",
            header: "Type",
            hideBelow: "md",
            render: (i: Invoice) => (
              <span className="rounded-lg bg-[#FAF0F4] px-2 py-0.5 text-[10px] font-bold text-[#71102F]">
                {i.kind === "tax_invoice" ? "Tax Invoice" : "Receipt"}
              </span>
            ),
          },
          {
            key: "issueDate",
            header: "Issued Date",
            sortable: true,
            hideBelow: "sm",
            render: (i: Invoice) => fmtDate(i.issueDate),
          },
          {
            key: "total",
            header: "Amount",
            sortable: true,
            render: (i: Invoice) => <b className="font-black text-[#1F191D]">{money(i.total)}</b>,
          },
          {
            key: "status",
            header: "Doc Status",
            sortable: true,
            render: (i: Invoice) => <StatusBadge status={i.status} />,
          },
          {
            key: "paymentStatus",
            header: "Payment",
            hideBelow: "lg",
            render: (i: Invoice) => <StatusBadge status={i.paymentStatus} />,
          },
        ]}
      />
      <CreateInvoice
        open={create}
        onClose={() => setCreate(false)}
        series={series.data}
        role={role}
        onCreated={(i) => router.push(`${base}/${i.id}`)}
      />
      {role === "admin" && (
        <SeriesModal open={seriesOpen} onClose={() => setSeriesOpen(false)} series={series.data} />
      )}
    </>
  );
}

function previewNo(s: InvoiceSeries | undefined, prefix: string, counter: number) {
  if (!s) return "…";
  return `${prefix}${s.includeYear ? `-${new Date().getFullYear()}` : ""}-${String(counter).padStart(
    s.padding,
    "0",
  )}`;
}

function CreateInvoice({
  open,
  onClose,
  series,
  onCreated,
  role,
}: {
  open: boolean;
  onClose: () => void;
  series?: InvoiceSeries;
  onCreated: (i: Invoice) => void;
  role: string;
}) {
  const { toast } = useToast();
  const clients = useList("clients", { status: "active", ...(role === "therapist" ? { therapistId: "t1" } : {}) });
  const create = useAction(
    (v: InvV) =>
      api.post<Invoice>("/invoices", {
        ...v,
        issueDate: new Date(v.issueDate).toISOString(),
        dueDate: new Date(v.dueDate).toISOString(),
      }),
    ["invoices", "settings"],
  );
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InvV>({
    resolver: zodResolver(invSchema) as never,
    mode: "onTouched",
    defaultValues: {
      clientId: "",
      kind: "tax_invoice",
      issueDate: today(),
      dueDate: plusDays(7),
      gst: 18,
      items: [{ description: "Individual therapy consultation (50 min)", qty: 1, rate: 2500 }],
      notes: "",
      status: "draft",
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const w = watch();
  const subtotal = (w.items ?? []).reduce(
    (s, i) => s + (Number(i.qty) || 0) * (Number(i.rate) || 0),
    0,
  );
  const tax = Math.round((subtotal * (Number(w.gst) || 0)) / 100);

  const submit = async (v: InvV) => {
    try {
      const inv = await create.mutateAsync(v);
      toast(`Document ${inv.no} generated successfully`);
      reset();
      onClose();
      onCreated(inv);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not create document", "error");
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Create New Billing Document"
      description={`Allocated document number: ${previewNo(
        series,
        w.kind === "receipt" ? series?.receiptPrefix ?? "RCP" : series?.invoicePrefix ?? "INV",
        series?.nextCounter ?? 0,
      )}`}
      className="w-[min(640px,100vw)]"
    >
      <form noValidate onSubmit={handleSubmit(submit)} className="space-y-5">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Select
            label="Client"
            placeholder="Select client…"
            error={errors.clientId?.message}
            options={(clients.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
            {...register("clientId")}
          />
          <Select
            label="Document type"
            options={[
              { value: "tax_invoice", label: "Tax Invoice" },
              { value: "receipt", label: "Payment Receipt" },
            ]}
            {...register("kind")}
          />
          <Input type="date" label="Issue date" error={errors.issueDate?.message} {...register("issueDate")} />
          <Input type="date" label="Due date" error={errors.dueDate?.message} {...register("dueDate")} />
          <Input
            type="number"
            label="GST %"
            error={errors.gst?.message}
            {...register("gst", { valueAsNumber: true })}
          />
          <Select
            label="Initial document status"
            options={[
              { value: "draft", label: "Draft" },
              { value: "sent", label: "Sent to Client" },
              { value: "paid", label: "Paid" },
            ]}
            {...register("status")}
          />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#6E686F]">Line Items</h3>
            <Button
              size="sm"
              variant="soft"
              icon={<Plus className="size-3" />}
              onClick={() => append({ description: "", qty: 1, rate: 0 })}
            >
              Add line item
            </Button>
          </div>
          <div className="space-y-2">
            {fields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-[1fr_64px_96px_34px] items-start gap-2">
                <Input
                  aria-label="Description"
                  placeholder="Service description"
                  error={errors.items?.[i]?.description?.message}
                  {...register(`items.${i}.description`)}
                />
                <Input
                  aria-label="Quantity"
                  type="number"
                  error={errors.items?.[i]?.qty?.message}
                  {...register(`items.${i}.qty`, { valueAsNumber: true })}
                />
                <Input
                  aria-label="Rate"
                  type="number"
                  error={errors.items?.[i]?.rate?.message}
                  {...register(`items.${i}.rate`, { valueAsNumber: true })}
                />
                <IconButton
                  label="Remove item"
                  className="mt-1"
                  disabled={fields.length === 1}
                  onClick={() => remove(i)}
                >
                  <Trash2 className="size-3.5" />
                </IconButton>
              </div>
            ))}
          </div>
          {errors.items?.root?.message && (
            <p className="mt-1.5 text-[11px] font-semibold text-[#9F1239]">{errors.items.root.message}</p>
          )}
        </div>
        <Textarea label="Notes & Payment Terms" placeholder="Printed on document..." {...register("notes")} />
        <div className="rounded-[16px] border border-[#EBC3D3] bg-gradient-to-br from-[#FDECF1] to-[#F4DCE6] p-4 text-xs">
          <div className="flex justify-between py-1 text-[#6E686F]">
            <span>Subtotal</span>
            <b className="text-[#1F191D]">{money(subtotal)}</b>
          </div>
          <div className="flex justify-between py-1 text-[#6E686F]">
            <span>GST ({w.gst || 0}%)</span>
            <b className="text-[#1F191D]">{money(tax)}</b>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-[#EBC3D3] pt-2 text-sm font-black">
            <span>Total Payable</span>
            <span className="text-base text-[#71102F]">{money(subtotal + tax)}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2.5 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Generate invoice
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

const seriesSchema = z
  .object({
    invoicePrefix: z
      .string()
      .min(2, "Min 2 characters")
      .max(8)
      .regex(/^[A-Za-z0-9]+$/, "Letters and numbers only"),
    receiptPrefix: z
      .string()
      .min(2)
      .max(8)
      .regex(/^[A-Za-z0-9]+$/, "Letters and numbers only"),
    startCounter: z.number({ message: "Required" }).int().min(1),
    nextCounter: z.number({ message: "Required" }).int().min(1),
    padding: z.number({ message: "Required" }).int().min(1).max(8),
    includeYear: z.boolean(),
    resetYearly: z.boolean(),
  })
  .refine((v) => v.nextCounter >= v.startCounter, {
    path: ["nextCounter"],
    message: "Next counter cannot be lower than the starting counter",
  });
type SeriesV = z.infer<typeof seriesSchema>;

export function SeriesModal({
  open,
  onClose,
  series,
}: {
  open: boolean;
  onClose: () => void;
  series?: InvoiceSeries;
}) {
  const { toast } = useToast();
  const save = useAction(
    (v: SeriesV) => api.put<InvoiceSeries>("/settings/invoice-series", v),
    ["settings"],
  );
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SeriesV>({
    resolver: zodResolver(seriesSchema) as never,
    values: series,
    mode: "onTouched",
  });
  const w = watch();
  if (!series) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invoice & Receipt Numbering Series"
      description="Configures prefix and numbering sequences for newly created billing documents. Existing historical numbers are immutable."
    >
      <form
        noValidate
        onSubmit={handleSubmit(async (v) => {
          try {
            await save.mutateAsync(v);
            toast("Numbering series updated");
            onClose();
          } catch (e) {
            toast(e instanceof Error ? e.message : "Could not save series", "error");
          }
        })}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Input label="Tax invoice prefix" error={errors.invoicePrefix?.message} {...register("invoicePrefix")} />
        <Input label="Receipt prefix" error={errors.receiptPrefix?.message} {...register("receiptPrefix")} />
        <Input
          type="number"
          label="Starting counter"
          hint="Baseline sequence number"
          error={errors.startCounter?.message}
          {...register("startCounter", { valueAsNumber: true })}
        />
        <Input
          type="number"
          label="Next document counter"
          hint="Next document created receives this number"
          error={errors.nextCounter?.message}
          {...register("nextCounter", { valueAsNumber: true })}
        />
        <Input
          type="number"
          label="Zero padding width"
          error={errors.padding?.message}
          {...register("padding", { valueAsNumber: true })}
        />
        <div className="space-y-2.5 pt-5">
          <Checkbox
            checked={!!w.includeYear}
            onChange={(v) => setValue("includeYear", v)}
            label="Include current calendar year in document code"
          />
          <Checkbox
            checked={!!w.resetYearly}
            onChange={(v) => setValue("resetYearly", v)}
            label="Reset sequence counter at the start of each fiscal year"
          />
        </div>
        <div className="rounded-[16px] border border-[#EBC3D3] bg-[#FDECF1] p-4 text-xs sm:col-span-2">
          <div className="text-[10px] font-black uppercase tracking-wider text-[#98143F]">
            Live Numbering Preview
          </div>
          <div className="mt-1.5 flex flex-col gap-1">
            <div className="font-extrabold text-[#1F191D]">
              {previewNo(w as InvoiceSeries, w.invoicePrefix ?? "", w.nextCounter || 0)}{" "}
              <span className="font-normal text-[#6E686F]">(Tax Invoice)</span>
            </div>
            <div className="font-extrabold text-[#1F191D]">
              {previewNo(w as InvoiceSeries, w.receiptPrefix ?? "", w.nextCounter || 0)}{" "}
              <span className="font-normal text-[#6E686F]">(Payment Receipt)</span>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2.5 sm:col-span-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Save numbering series
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export { FormDialog };
