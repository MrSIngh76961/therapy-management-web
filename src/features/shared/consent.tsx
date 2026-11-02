"use client";
import { BellRing, CheckCircle2, FileLock2, Lock, Send, ShieldAlert, ShieldCheck, ShieldOff, Sparkles, User } from "lucide-react";
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
  "Your personal and sensitive health data is collected and processed solely for therapeutic care and clinical administration.",
  "Live audio and video streams are end-to-end encrypted; consultations are never recorded without explicit bilateral consent.",
  "Optional AI transcription is utilized in real-time solely to assist your clinician with session documentation and summaries.",
  "You retain absolute rights to access, rectify, export, or withdraw consent for your data at any time under India's DPDP Act 2023.",
];

export function ConsentPolicy() {
  return (
    <Card hover={false} variant="ivory" className="p-5">
      <div className="mb-3 flex items-center gap-2.5 text-xs font-extrabold text-wine">
        <div className="grid size-7 place-items-center rounded-lg bg-rose text-wine">
          <FileLock2 className="size-4" />
        </div>
        <span>DPDPA 2023 — Data Processing & Privacy Notice</span>
      </div>
      <ul className="grid gap-2 text-xs text-muted sm:grid-cols-2">
        {consentPoints.map((p, i) => (
          <li key={i} className="flex items-start gap-2 rounded-xl bg-white/70 p-2.5 border border-line/60">
            <CheckCircle2 className="size-4 text-ok shrink-0 mt-0.5" />
            <span className="text-[11px] leading-relaxed text-ink/80">{p}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function ConsentView({ role, clientId }: { role: Role; clientId?: string }) {
  const base = useScope(role);
  const scope = { ...base, ...(clientId ? { clientId } : {}) };
  const all = useList("consents", scope);
  const clients = useList("clients", { therapistId: base.therapistId }, role === "therapist");
  const respond = useAction(
    (v: { id: string; status: Consent["status"] }) => api.post(`/consents/${v.id}/respond`, { status: v.status }),
    ["consents", "clients"]
  );
  const request = useAction((clientId: string) => api.post("/consents/request", { clientId }), ["consents", "clients"]);
  const { toast } = useToast();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const count = (s: Consent["status"]) => (all.data ?? []).filter((c) => c.status === s).length;
  const therapist = role === "therapist";

  const remind = async (c: Consent) => {
    await providers.notification.send({ channel: "whatsapp", to: c.clientName, template: "consent_reminder" });
    toast(`WhatsApp reminder dispatched to ${c.clientName}`);
  };

  const change = async (c: Consent, status: Consent["status"]) => {
    const ok = await confirm({
      title: status === "withdrawn" ? "Withdraw Consent?" : "Provide Consent?",
      description:
        status === "withdrawn"
          ? "Your therapist will no longer be authorized to record session summaries or generate AI transcripts until consent is renewed."
          : "You agree to the DPDPA 2023 data-processing notice and terms outlined on this platform.",
      confirmLabel: status === "withdrawn" ? "Withdraw Consent" : "I Agree & Consent",
      danger: status === "withdrawn",
    });
    if (!ok) return;
    try {
      await respond.mutateAsync({ id: c.id, status });
      toast(status === "withdrawn" ? "Consent withdrawn" : "Consent recorded successfully", status === "withdrawn" ? "info" : "success");
    } catch {
      toast("Could not update consent", "error");
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Compliance & Governance"
        title="DPDPA 2023 Consent Records"
        subtitle={
          therapist
            ? "Request, track and manage client data-processing agreements. Unregistered clients can consent securely via token link."
            : "Review, manage, or withdraw the data processing consents granted to your healthcare providers."
        }
        actions={
          therapist && (
            <Button icon={<Send className="size-3.5" />} onClick={() => setOpen(true)}>
              Request Consent
            </Button>
          )
        }
      />

      <StaggerGrid className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Consents Granted" value={count("provided")} tone="mint" icon={<ShieldCheck className="size-4" />} />
        <StatCard label="Pending Approval" value={count("pending")} tone="coral" up={false} icon={<BellRing className="size-4" />} />
        <StatCard label="Withdrawn / Revoked" value={count("withdrawn")} tone="lavender" up={false} icon={<ShieldOff className="size-4" />} />
      </StaggerGrid>

      {!therapist && (
        <div className="mb-5">
          <ConsentPolicy />
        </div>
      )}

      <DataTable
        resource="consents"
        baseParams={scope}
        searchPlaceholder="Search consents by client or type…"
        defaultSort={{ key: "requestedAt", dir: "desc" }}
        filters={[
          {
            key: "status",
            label: "Status",
            options: ["pending", "provided", "withdrawn"].map((v) => ({
              value: v,
              label: v[0].toUpperCase() + v.slice(1),
            })),
          },
        ]}
        emptyTitle="No consent records found"
        emptyDescription={
          therapist
            ? "Send a consent request to an incoming client to initialize their DPDPA compliance trail."
            : "Consent requests from your healthcare providers will appear here."
        }
        columns={[
          ...(therapist
            ? [
                {
                  key: "clientName",
                  header: "Client",
                  sortable: true,
                  render: (c: Consent) => (
                    <div className="flex items-center gap-2">
                      <div className="grid size-7 place-items-center rounded-lg bg-rose text-wine font-bold text-xs">
                        <User className="size-3.5" />
                      </div>
                      <span className="font-semibold text-ink">{c.clientName}</span>
                    </div>
                  ),
                },
              ]
            : []),
          {
            key: "type",
            header: "Scope of Consent",
            hideBelow: "md" as const,
            render: (c: Consent) => <span className="font-medium text-ink/80">{c.type}</span>,
          },
          {
            key: "channel",
            header: "Acquisition Channel",
            hideBelow: "lg" as const,
            render: (c: Consent) => (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warm-ivory px-2.5 py-0.5 text-[11px] font-semibold text-ink border border-line">
                {c.channel === "secure_link" ? "Secure Link (Token)" : "Portal Account"}
              </span>
            ),
          },
          {
            key: "requestedAt",
            header: "Requested At",
            sortable: true,
            render: (c: Consent) => <span className="text-muted text-xs">{fmtDateTime(c.requestedAt)}</span>,
          },
          {
            key: "status",
            header: "Status",
            sortable: true,
            render: (c: Consent) => <StatusBadge status={c.status} />,
          },
          {
            key: "act",
            header: "Action",
            align: "right" as const,
            render: (c: Consent) => (
              <span className="inline-flex gap-2" onClick={(e) => e.stopPropagation()}>
                {therapist && c.status === "pending" && (
                  <Button size="sm" variant="outline" onClick={() => remind(c)}>
                    Send Reminder
                  </Button>
                )}
                {!therapist && c.status !== "provided" && (
                  <Button size="sm" onClick={() => change(c, "provided")}>
                    Grant Consent
                  </Button>
                )}
                {!therapist && c.status === "provided" && (
                  <Button size="sm" variant="danger" onClick={() => change(c, "withdrawn")}>
                    Withdraw
                  </Button>
                )}
              </span>
            ),
          },
        ]}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Request DPDPA Consent"
        description="Unregistered clients receive a secure tokenized link; registered clients receive an in-portal prompt."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!target}
              loading={request.isPending}
              onClick={async () => {
                try {
                  await request.mutateAsync(target);
                  toast("Consent request dispatched successfully");
                  setOpen(false);
                  setTarget("");
                } catch {
                  toast("Could not send consent request", "error");
                }
              }}
            >
              Dispatch Request
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Client from Caseload"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Select client…"
            options={(clients.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
          />
          <div className="rounded-xl border border-line bg-warm-ivory p-3.5 text-xs text-muted flex items-center gap-2.5">
            <Sparkles className="size-4 text-wine shrink-0" />
            <span>
              The client will receive a verified notification with a one-time link to review data practices and grant consent.
            </span>
          </div>
        </div>
      </Modal>
    </>
  );
}
