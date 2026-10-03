"use client";
import { Download, Eye, FileSpreadsheet, FileText, Presentation, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Progress, StatusBadge } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/overlay";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { useCreate, useList, useRemove } from "@/hooks/useResource";
import { fmtBytes, fmtDate } from "@/lib/format";
import { providers } from "@/services/providers/registry";
import { ALLOWED_EXT, MAX_FILE_MB, validateFile } from "@/services/providers/mock";
import type { Role, SharedDocument } from "@/services/types";
import { useScope } from "./scope";

const icon = { pdf: FileText, docx: FileText, xlsx: FileSpreadsheet, pptx: Presentation };
const normalizeExt = (n: string): SharedDocument["ext"] => { const e = n.split(".").pop()!.toLowerCase(); return e.startsWith("xls") ? "xlsx" : e.startsWith("ppt") ? "pptx" : e.startsWith("doc") ? "docx" : "pdf"; };

export function DocumentsView({ role, clientId }: { role: Role; clientId?: string }) {
  const { user } = useAuth();
  const scope = useScope(role);
  const base = { ...scope, ...(clientId ? { clientId } : {}) };
  const clients = useList("clients", scope, role === "therapist" && !clientId);
  const links = useList("therapist-links", { clientId: user?.id }, role === "client");
  const create = useCreate("documents"), remove = useRemove("documents");
  const { toast } = useToast(), confirm = useConfirm();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [target, setTarget] = useState(clientId ?? "");
  const [perm, setPerm] = useState<SharedDocument["permission"]>("download");
  const [pct, setPct] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState("");

  const pick = (f?: File) => { if (!f) return; const e = validateFile(f); setError(e ?? ""); setFile(e ? null : f); };
  const reset = () => { setOpen(false); setFile(null); setError(""); setPct(0); setBusy(false); };
  const upload = async () => {
    if (!file) return setError("Choose a file first.");
    const therapistId = role === "client" ? links.data?.find((l) => l.status !== "ended")?.therapistId : scope.therapistId;
    const clientTarget = role === "client" ? user?.id : target;
    if (!clientTarget) return setError("Select a client to share with.");
    setBusy(true);
    try {
      const up = await providers.storage.upload(file, setPct);
      const c = clients.data?.find((x) => x.id === clientTarget);
      await create.mutateAsync({ name: up.name, ext: normalizeExt(up.name), size: up.size, clientId: clientTarget, clientName: c?.name ?? user?.name ?? "", therapistId: therapistId ?? "", uploadedBy: role === "client" ? "client" : "therapist", date: new Date().toISOString(), permission: perm });
      toast("Document shared securely"); reset();
    } catch (e) { setError(e instanceof Error ? e.message : "Upload failed. Please retry."); setBusy(false); }
  };
  const open_ = async (d: SharedDocument, dl: boolean) => { const r = await providers.storage.getSignedUrl(`docs/${d.id}/${d.name}`); toast(dl ? `Download started: ${d.name}` : `Opening ${d.name} (signed link, expires in ${Math.round(r.expiresInSec / 60)} min)`, "info"); };

  return (
    <>
      <PageHeader eyebrow="Sharing" title="Documents" subtitle={`Securely share ${role === "client" ? "files with your therapist" : "worksheets and reports with clients"}. PDF, Word, Excel and PowerPoint up to ${MAX_FILE_MB} MB.`} actions={<Button icon={<Upload className="size-3.5" />} onClick={() => setOpen(true)}>Upload document</Button>} />
      <DataTable resource="documents" baseParams={base} searchPlaceholder="Search documents…" defaultSort={{ key: "date", dir: "desc" }}
        filters={[{ key: "ext", label: "Type", options: ["pdf", "docx", "xlsx", "pptx"].map((v) => ({ value: v, label: v.toUpperCase() })) }, { key: "uploadedBy", label: "Uploaded by", options: [{ value: "therapist", label: "Therapist" }, { value: "client", label: "Client" }] }]}
        emptyTitle="No documents" emptyDescription="Uploaded files will appear here." emptyAction={<Button onClick={() => setOpen(true)}>Upload document</Button>}
        rowActions={(d) => [{ label: "View", icon: <Eye className="size-3.5" />, onSelect: () => open_(d, false) }, { label: "Download", icon: <Download className="size-3.5" />, onSelect: () => open_(d, true) }, ...((role !== "client" || d.uploadedBy === "client") ? [{ label: "Delete", icon: <Trash2 className="size-3.5" />, danger: true, onSelect: async () => { if (await confirm({ title: `Delete ${d.name}?`, description: "This file will be removed for everyone it was shared with.", confirmLabel: "Delete", danger: true })) remove.mutate(d.id, { onSuccess: () => toast("Document deleted", "info") }); } }] : [])]}
        columns={[
          { key: "name", header: "File", sortable: true, render: (d: SharedDocument) => { const I = icon[d.ext]; return <div className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-lg bg-rose text-wine"><I className="size-4" /></span><div><div className="font-bold">{d.name}</div><div className="text-[10px] text-muted">{fmtBytes(d.size)}</div></div></div>; } },
          ...(role === "therapist" ? [{ key: "clientName", header: "Client", sortable: true, hideBelow: "md" as const }] : []),
          { key: "uploadedBy", header: "From", hideBelow: "sm" as const, render: (d: SharedDocument) => <StatusBadge status={d.uploadedBy} /> },
          { key: "permission", header: "Access", hideBelow: "lg" as const, render: (d: SharedDocument) => <span className="capitalize">{d.permission}</span> },
          { key: "date", header: "Date", sortable: true, render: (d: SharedDocument) => fmtDate(d.date) },
        ]} />
      <Modal open={open} onClose={busy ? () => {} : reset} title="Upload document" description="Files are stored through the StorageProvider with signed, expiring links."
        footer={<><Button variant="outline" disabled={busy} onClick={reset}>Cancel</Button><Button loading={busy} onClick={upload}>Upload & share</Button></>}>
        <div className="space-y-3.5">
          {role === "therapist" && !clientId && <Select label="Share with" value={target} onChange={(e) => setTarget(e.target.value)} options={(clients.data ?? []).map((c) => ({ value: c.id, label: c.name }))} placeholder="Select client…" />}
          {role === "therapist" && <Select label="Client access" value={perm} onChange={(e) => setPerm(e.target.value as SharedDocument["permission"])} options={[{ value: "download", label: "View & download" }, { value: "view", label: "View only" }]} />}
          <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]); }} className="rounded-xl border-2 border-dashed border-[#e3c8d0] bg-[#fffafb] p-6 text-center">
            <Upload className="mx-auto mb-2 size-6 text-wine" />
            <p className="text-xs font-bold">{file ? file.name : "Drag & drop a file here"}</p>
            <p className="mb-3 text-[10px] text-muted">{file ? fmtBytes(file.size) : `.${ALLOWED_EXT.join(", .")}`}</p>
            <Button size="sm" variant="outline" onClick={() => input.current?.click()}>Browse files</Button>
            <input ref={input} type="file" hidden accept={ALLOWED_EXT.map((e) => `.${e}`).join(",")} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
          {busy && <Progress value={pct} />}
          {error && <p role="alert" className="rounded-lg bg-[#fdecee] px-3 py-2 text-xs font-semibold text-bad">{error}</p>}
        </div>
      </Modal>
    </>
  );
}