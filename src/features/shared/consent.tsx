"use client";
import { BellRing, FileLock2, Send, ShieldCheck, ShieldOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, StatCard, StatusBadge } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { DataTable } from "@/components/ui/data-table";
import { Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/overlay";
import { PageHeader, StaggerGrid } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { useAction, useList } from "@/hooks/useResource";
import { fmtDateTime } from "@/lib/format";
import { api } from "@/services/api";
import { providers } from "@/services/providers/registry";
import type { Consent, Role } from "@/services/types";
import { useScope } from "./scope";

export const consentPoints = [
  "Your personal and health information is processed only for providing therapy and related administration.",
  "Session audio/video is not recorded. Optional live transcription is used only to help your therapist take notes.",
  "You may withdraw consent, access, correct or erase your data at any time from your profile.",
  "Data is stored securely in India and shared only with the therapists you choose.",
];

export function ConsentPolicy() {
  return (
    <Card hover={false} className="p-4"><div className="mb-2 flex items-center gap-2 text-xs font-extrabold"><FileLock2 className="size-4 text-wine" />DPDPA 2023 — what you are consenting to</div>
      <ul className="list-disc space-y-1.5 pl-4 text-[11px] text-muted">{consentPoints.map((p) => <li key={p}>{p}</li>)}</ul></Card>
  );
}

export function ConsentView({ role, clientId }: { role: Role; clientId?: string }) {
  const base = useScope(role);
  const scope = { ...base, ...(clientId ? { clientId } : {}) };
  const all = useList("consents", scope);
  const clients = useList("clients", { therapistId: base.therapistId }, role === "therapist");
  const respond = useAction((v: { id: string; status: Consent["status"] }) => api.post(`/consents/${v.id}/respond`, { status: v.status }), ["consents", "clients"]);
  const request = useAction((clientId: string) => api.post("/consents/request", { clientId }), ["consents", "clients"]);
  const { toast } = useToast(), confirm = useConfirm();
  const [open, setOpen] = useState(false), [target, setTarget] = useState("");
  const count = (s: Consent["status"]) => (all.data ?? []).filter((c) => c.status === s).length;
  const therapist = role === "therapist";

  const remind = async (c: Consent) => { await providers.notification.send({ channel: "whatsapp", to: c.clientName, template: "consent_reminder" }); toast(`Reminder sent to ${c.clientName}`); };
  const change = async (c: Consent, status: Consent["status"]) => {
    const ok = await confirm({ title: status === "withdrawn" ? "Withdraw consent?" : "Provide consent?", description: status === "withdrawn" ? "Your therapist will no longer be able to record transcripts or share session data until you consent again." : "You agree to the DPDPA data-processing terms listed on this page.", confirmLabel: status === "withdrawn" ? "Withdraw" : "I agree", danger: status === "withdrawn" });
    if (!ok) return;
    try { await respond.mutateAsync({ id: c.id, status }); toast(status === "withdrawn" ? "Consent withdrawn" : "Consent recorded", status === "withdrawn" ? "info" : "success"); } catch { toast("Could not update consent", "error"); }
  };

  return (
    <>
      <PageHeader eyebrow="Privacy" title="DPDPA Consent" subtitle={therapist ? "Request and track client consent. Clients can respond from a secure link without creating an account." : "Review and manage the consent you have given to your therapists."} actions={therapist && <Button icon={<Send className="size-3.5" />} onClick={() => setOpen(true)}>Request consent</Button>} />
      <StaggerGrid className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Provided" value={count("provided")} icon={<ShieldCheck className="size-4" />} /><StatCard label="Pending" value={count("pending")} up={false} icon={<BellRing className="size-4" />} /><StatCard label="Withdrawn" value={count("withdrawn")} up={false} icon={<ShieldOff className="size-4" />} />
      </StaggerGrid>
      {!therapist && <div className="mb-4"><ConsentPolicy /></div>}
      <DataTable resource="consents" baseParams={scope} searchPlaceholder="Search…" defaultSort={{ key: "requestedAt", dir: "desc" }}
        filters={[{ key: "status", label: "Status", options: ["pending", "provided", "withdrawn"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })) }]}
        emptyTitle="No consent records" emptyDescription={therapist ? "Request consent from a client to get started." : "Consent requests from your therapists appear here."}
        columns={[
          ...(therapist ? [{ key: "clientName", header: "Client", sortable: true }] : []),
          { key: "type", header: "Consent", hideBelow: "md" as const },
          { key: "channel", header: "Via", hideBelow: "lg" as const, render: (c: Consent) => (c.channel === "secure_link" ? "Secure link" : "Portal") },
          { key: "requestedAt", header: "Requested", sortable: true, render: (c: Consent) => fmtDateTime(c.requestedAt) },
          { key: "status", header: "Status", sortable: true, render: (c: Consent) => <StatusBadge status={c.status} /> },
          { key: "act", header: "", align: "right" as const, render: (c: Consent) => (
            <span className="inline-flex gap-1.5" onClick={(e) => e.stopPropagation()}>
              {therapist && c.status === "pending" && <Button size="sm" variant="outline" onClick={() => remind(c)}>Remind</Button>}
              {!therapist && c.status !== "provided" && <Button size="sm" onClick={() => change(c, "provided")}>Provide</Button>}
              {!therapist && c.status === "provided" && <Button size="sm" variant="danger" onClick={() => change(c, "withdrawn")}>Withdraw</Button>}
            </span>) },
        ]} />
      <Modal open={open} onClose={() => setOpen(false)} title="Request DPDPA consent" description="Unregistered clients receive a secure link; registered clients see it in their portal." footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={!target} loading={request.isPending} onClick={async () => { try { await request.mutateAsync(target); toast("Consent request sent"); setOpen(false); setTarget(""); } catch { toast("Could not send request", "error"); } }}>Send request</Button></>}>
        <Select label="Client" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Select client…" options={(clients.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
      </Modal>
    </>
  );
}