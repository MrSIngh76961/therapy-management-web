"use client";
import { Download, Eye, FileSpreadsheet, FileText, Lock, Presentation, ShieldCheck, Trash2, Upload, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, Progress, StatusBadge } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { DataTable } from "@/components/ui/data-table";
import { Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/overlay";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { useCreate, useList, useRemove } from "@/hooks/useResource";
import { cn } from "@/lib/cn";
import { fmtBytes, fmtDate } from "@/lib/format";
import { providers } from "@/services/providers/registry";
import { ALLOWED_EXT, MAX_FILE_MB, validateFile } from "@/services/providers/mock";
import type { Role, SharedDocument } from "@/services/types";
import { useScope } from "./scope";

const extConfig: Record<
  SharedDocument["ext"],
  { icon: typeof FileText; bg: string; text: string; label: string }
> = {
  pdf: { icon: FileText, bg: "bg-rose", text: "text-wine", label: "PDF Document" },
  docx: { icon: FileText, bg: "bg-soft-blue", text: "text-info", label: "Word Document" },
  xlsx: { icon: FileSpreadsheet, bg: "bg-mint", text: "text-ok", label: "Spreadsheet" },
  pptx: { icon: Presentation, bg: "bg-coral", text: "text-[#c2410c]", label: "Presentation" },
};

const normalizeExt = (n: string): SharedDocument["ext"] => {
  const e = n.split(".").pop()!.toLowerCase();
  return e.startsWith("xls") ? "xlsx" : e.startsWith("ppt") ? "pptx" : e.startsWith("doc") ? "docx" : "pdf";
};

export function DocumentsView({ role, clientId }: { role: Role; clientId?: string }) {
  const { user } = useAuth();
  const scope = useScope(role);
  const base = { ...scope, ...(clientId ? { clientId } : {}) };
  const clients = useList("clients", scope, role === "therapist" && !clientId);
  const links = useList("therapist-links", { clientId: user?.id }, role === "client");
  const create = useCreate("documents");
  const remove = useRemove("documents");
  const { toast } = useToast();
  const confirm = useConfirm();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [target, setTarget] = useState(clientId ?? "");
  const [perm, setPerm] = useState<SharedDocument["permission"]>("download");
  const [pct, setPct] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  const pick = (f?: File) => {
    if (!f) return;
    const e = validateFile(f);
    setError(e ?? "");
    setFile(e ? null : f);
  };

  const reset = () => {
    setOpen(false);
    setFile(null);
    setError("");
    setPct(0);
    setBusy(false);
    setIsDragOver(false);
  };

  const upload = async () => {
    if (!file) return setError("Choose a file first.");
    const therapistId = role === "client" ? links.data?.find((l) => l.status !== "ended")?.therapistId : scope.therapistId;
    const clientTarget = role === "client" ? user?.id : target;
    if (!clientTarget) return setError("Select a client to share with.");
    setBusy(true);
    try {
      const up = await providers.storage.upload(file, setPct);
      const c = clients.data?.find((x) => x.id === clientTarget);
      await create.mutateAsync({
        name: up.name,
        ext: normalizeExt(up.name),
        size: up.size,
        clientId: clientTarget,
        clientName: c?.name ?? user?.name ?? "",
        therapistId: therapistId ?? "",
        uploadedBy: role === "client" ? "client" : "therapist",
        date: new Date().toISOString(),
        permission: perm,
      });
      toast("Document shared securely with signed URL");
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please retry.");
      setBusy(false);
    }
  };

  const open_ = async (d: SharedDocument, dl: boolean) => {
    const r = await providers.storage.getSignedUrl(`docs/${d.id}/${d.name}`);
    toast(
      dl
        ? `Secure download started: ${d.name}`
        : `Opening ${d.name} via signed URL (expires in ${Math.round(r.expiresInSec / 60)} min)`,
      "info"
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="Clinical Vault"
        title="Document Repository"
        subtitle={`Encrypted storage for worksheets, diagnostic reports and assessments up to ${MAX_FILE_MB} MB. All files are protected by expiring signed URLs.`}
        actions={
          <Button icon={<Upload className="size-3.5" />} onClick={() => setOpen(true)}>
            Upload Document
          </Button>
        }
      />

      <DataTable
        resource="documents"
        baseParams={base}
        searchPlaceholder="Search files by name, client or type…"
        defaultSort={{ key: "date", dir: "desc" }}
        filters={[
          {
            key: "ext",
            label: "File Format",
            options: ["pdf", "docx", "xlsx", "pptx"].map((v) => ({
              value: v,
              label: v.toUpperCase(),
            })),
          },
          {
            key: "uploadedBy",
            label: "Author",
            options: [
              { value: "therapist", label: "Therapist" },
              { value: "client", label: "Client" },
            ],
          },
        ]}
        emptyTitle="No documents in vault"
        emptyDescription="Clinical worksheets and shared files will appear here."
        emptyAction={
          <Button onClick={() => setOpen(true)} icon={<Upload className="size-3.5" />}>
            Upload Document
          </Button>
        }
        rowActions={(d) => [
          {
            label: "Open Secure Link",
            icon: <Eye className="size-3.5" />,
            onSelect: () => open_(d, false),
          },
          {
            label: "Download",
            icon: <Download className="size-3.5" />,
            onSelect: () => open_(d, true),
          },
          ...(role !== "client" || d.uploadedBy === "client"
            ? [
                {
                  label: "Delete",
                  icon: <Trash2 className="size-3.5" />,
                  danger: true,
                  onSelect: async () => {
                    if (
                      await confirm({
                        title: `Delete ${d.name}?`,
                        description: "This document will be permanently removed for all shared parties.",
                        confirmLabel: "Delete Document",
                        danger: true,
                      })
                    )
                      remove.mutate(d.id, {
                        onSuccess: () => toast("Document removed from vault", "info"),
                      });
                  },
                },
              ]
            : []),
        ]}
        columns={[
          {
            key: "name",
            header: "Document Name",
            sortable: true,
            render: (d: SharedDocument) => {
              const conf = extConfig[d.ext] || extConfig.pdf;
              const IconComp = conf.icon;
              return (
                <div className="flex items-center gap-3">
                  <div className={cn("grid size-9 shrink-0 place-items-center rounded-xl font-bold uppercase", conf.bg, conf.text)}>
                    <IconComp className="size-4" />
                  </div>
                  <div>
                    <div className="font-bold text-ink hover:text-wine transition-colors">{d.name}</div>
                    <div className="text-[10px] text-muted font-medium">
                      {conf.label} · {fmtBytes(d.size)}
                    </div>
                  </div>
                </div>
              );
            },
          },
          ...(role === "therapist"
            ? [
                {
                  key: "clientName",
                  header: "Client",
                  sortable: true,
                  hideBelow: "md" as const,
                  render: (d: SharedDocument) => <span className="font-semibold text-ink/80">{d.clientName}</span>,
                },
              ]
            : []),
          {
            key: "uploadedBy",
            header: "Shared By",
            hideBelow: "sm" as const,
            render: (d: SharedDocument) => <StatusBadge status={d.uploadedBy} />,
          },
          {
            key: "permission",
            header: "Access Rights",
            hideBelow: "lg" as const,
            render: (d: SharedDocument) => (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted capitalize">
                {d.permission === "view" ? <Lock className="size-3" /> : <ShieldCheck className="size-3 text-ok" />}
                {d.permission === "download" ? "View & Download" : "View Only"}
              </span>
            ),
          },
          {
            key: "date",
            header: "Date Uploaded",
            sortable: true,
            render: (d: SharedDocument) => fmtDate(d.date),
          },
        ]}
      />

      <Modal
        open={open}
        onClose={busy ? () => {} : reset}
        title="Upload to Secure Clinical Vault"
        description="Files are encrypted at rest and delivered through expiring signed URLs under DPDPA standards."
        footer={
          <>
            <Button variant="outline" disabled={busy} onClick={reset}>
              Cancel
            </Button>
            <Button loading={busy} onClick={upload} icon={<Upload className="size-3.5" />}>
              Upload & Share Securely
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {role === "therapist" && !clientId && (
            <Select
              label="Share with Client"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              options={(clients.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Select client from your caseload…"
            />
          )}

          {role === "therapist" && (
            <Select
              label="Client Permissions"
              value={perm}
              onChange={(e) => setPerm(e.target.value as SharedDocument["permission"])}
              options={[
                { value: "download", label: "View & Download" },
                { value: "view", label: "View Only (In-browser preview)" },
              ]}
            />
          )}

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              pick(e.dataTransfer.files[0]);
            }}
            className={cn(
              "rounded-2xl border-2 border-dashed p-7 text-center transition-all",
              isDragOver
                ? "border-wine bg-rose/55 scale-[1.01]"
                : "border-line bg-gradient-to-b from-warm-ivory to-white hover:border-wine/40"
            )}
          >
            <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-rose text-wine shadow-xs">
              <UploadCloud className="size-6" />
            </div>
            <p className="text-xs font-bold text-ink">{file ? file.name : "Drag & drop your clinical document here"}</p>
            <p className="mb-4 mt-1 text-[11px] text-muted">
              {file
                ? fmtBytes(file.size)
                : `Accepted formats: .${ALLOWED_EXT.join(", .")} (up to ${MAX_FILE_MB} MB)`}
            </p>
            <Button size="sm" variant="outline" onClick={() => input.current?.click()}>
              Browse Local Files
            </Button>
            <input
              ref={input}
              type="file"
              hidden
              accept={ALLOWED_EXT.map((e) => `.${e}`).join(",")}
              onChange={(e) => {
                pick(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>

          {busy && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold text-wine">
                <span>Encrypting & uploading…</span>
                <span>{pct}%</span>
              </div>
              <Progress value={pct} />
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-xl border border-bad/20 bg-coral p-3 text-xs font-semibold text-bad">
              {error}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
