"use client";
import { motion } from "framer-motion";
import { CalendarPlus, HeartHandshake, Plus, Star, UserMinus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Avatar, Card, KV, SectionCard, StatusBadge } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { CardSkeleton, EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useAction, useItem, useList, useUpdate } from "@/hooks/useResource";
import { fmtDate, money } from "@/lib/format";
import { api } from "@/services/api";
import { AppointmentsView } from "@/features/shared/appointments";
import { DocumentsView } from "@/features/shared/documents";
import { FormDialog } from "@/features/shared/form-dialog";
import { SessionsView } from "@/features/shared/sessions";
import { TasksView } from "@/features/shared/tasks";

const schema = z.object({ code: z.string().min(3, "Enter the therapist's email or code") });

export function TherapistsPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const q = useList("therapist-links", { clientId: user?.id });
  const add = useAction(
    (code: string) => api.post("/therapist-links", { code, clientId: user?.id }),
    ["therapist-links"],
  );
  const update = useUpdate("therapist-links");
  const { toast } = useToast();
  const confirm = useConfirm();
  const rows = (q.data ?? []).filter((l) => tab === "all" || l.status === tab);

  return (
    <>
      <PageHeader
        eyebrow="Care Team"
        title="My Therapists"
        subtitle="Manage your connected clinical team or link a new practitioner using their email or clinic referral code."
        actions={
          <Button icon={<Plus className="size-3.5" />} onClick={() => setOpen(true)}>
            Connect therapist
          </Button>
        }
      />
      <Tabs
        className="mb-5 w-fit"
        value={tab}
        onChange={setTab}
        items={[
          { id: "all", label: "All Clinicians" },
          { id: "active", label: "Active Care" },
          { id: "newly_added", label: "Newly Connected" },
          { id: "ended", label: "Past Care" },
        ]}
      />
      {q.isLoading ? (
        <CardSkeleton rows={3} />
      ) : q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<HeartHandshake className="size-6 text-[#98143F]" />}
          title="No clinicians connected yet"
          description="Connect with your therapist using their email or referral code (e.g. aisha.sharma@theraflow.in)."
          action={<Button onClick={() => setOpen(true)}>Connect therapist</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((l, i) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card variant="ivory" className="flex h-full flex-col justify-between p-5">
                <div>
                  <div className="flex items-start gap-3.5">
                    <Avatar name={l.therapistName} size={46} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-black text-[#1F191D]">{l.therapistName}</div>
                      <div className="truncate text-[11px] font-semibold text-[#71102F]">
                        {l.specialization}
                      </div>
                    </div>
                    <StatusBadge status={l.status} />
                  </div>
                  <div className="mt-4 rounded-xl border border-[#EDE4E8] bg-white p-3 text-xs text-[#6E686F]">
                    Connected since <b>{fmtDate(l.since)}</b>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#F0E6EB] pt-3.5">
                  <Link href={`/client/therapists/${l.therapistId}`}>
                    <Button size="sm" variant="outline">
                      View profile
                    </Button>
                  </Link>
                  {l.status === "newly_added" && (
                    <Button
                      size="sm"
                      icon={<CalendarPlus className="size-3" />}
                      onClick={async () => {
                        await update.mutateAsync({ id: l.id, status: "active" });
                        toast(`${l.therapistName} is now your active therapist`);
                      }}
                    >
                      Start care
                    </Button>
                  )}
                  {l.status !== "ended" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<UserMinus className="size-3" />}
                      onClick={async () => {
                        if (
                          await confirm({
                            title: `End care connection with ${l.therapistName}?`,
                            description:
                              "You can reconnect with them at any time. Past appointments, invoices, and shared records remain saved in your account.",
                            confirmLabel: "End connection",
                            danger: true,
                          })
                        ) {
                          await update.mutateAsync({ id: l.id, status: "ended" });
                          toast("Care connection closed", "info");
                        }
                      }}
                    >
                      End care
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
      <FormDialog<{ code: string }>
        open={open}
        onClose={() => setOpen(false)}
        title="Connect with a Therapist"
        description="Enter your practitioner's registered email address or clinic referral code."
        submitLabel="Link therapist"
        schema={schema}
        successMessage="Therapist linked to your care team"
        fields={[
          {
            name: "code",
            label: "Therapist email or practice code",
            placeholder: "e.g. aisha.sharma@theraflow.in or TF-t1",
          },
        ]}
        defaultValues={{ code: "" }}
        onSubmit={(v) => add.mutateAsync(v.code)}
      />
    </>
  );
}

export function TherapistDashboard() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const t = useItem("therapists", id);
  const links = useList("therapist-links", { clientId: user?.id });
  const link = links.data?.find((l) => l.therapistId === id);
  const upcoming = useList("appointments", {
    clientId: user?.id,
    therapistId: id,
    scope: "upcoming",
    sort: "start",
    dir: "asc",
  });

  if (t.isError)
    return (
      <>
        <PageHeader back={{ href: "/client/therapists", label: "My Therapists" }} title="Therapist Profile" />
        <ErrorState message="Therapist profile could not be found." onRetry={() => t.refetch()} />
      </>
    );

  const d = t.data;
  if (!d)
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/3 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
      </div>
    );

  return (
    <>
      <PageHeader
        back={{ href: "/client/therapists", label: "My Therapists" }}
        eyebrow="Clinician Profile"
        title={d.name}
        subtitle={`${d.specialization} · ${d.experience} years clinical experience`}
        actions={
          <>
            {link && <StatusBadge status={link.status} />}
            <Button
              icon={<CalendarPlus className="size-3.5" />}
              onClick={() => router.push("/client/appointments?new=1")}
            >
              Book session
            </Button>
          </>
        }
      />
      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        items={["overview", "sessions", "appointments", "tasks", "documents"].map((x) => ({
          id: x,
          label: x === "overview" ? "About & Clinical Bio" : x[0].toUpperCase() + x.slice(1),
        }))}
      />
      {tab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <SectionCard variant="ivory" title="Clinical Background & Approach">
            <p className="text-xs leading-relaxed text-[#554F54]">
              {d.bio ?? "Your practitioner has not yet added a public clinical bio."}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl border border-[#EDE4E8] bg-white p-4 sm:grid-cols-4">
              <KV label="Languages">{d.languages ?? "English, Hindi"}</KV>
              <KV label="Consultation Fee">{money(d.fee)}</KV>
              <KV label="Patient Rating">
                <span className="inline-flex items-center gap-1 font-bold text-[#D97706]">
                  <Star className="size-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                  {d.rating ? d.rating.toFixed(1) : "New Practitioner"}
                </span>
              </KV>
              <KV label="RCI License / No.">{d.license || "Verified"}</KV>
            </div>
          </SectionCard>
          <SectionCard variant="ivory" title="Upcoming with this Clinician">
            {upcoming.isLoading ? (
              <Skeleton className="h-20 rounded-xl" />
            ) : upcoming.data?.length ? (
              <div className="space-y-2.5">
                {upcoming.data.slice(0, 3).map((a) => (
                  <Card key={a.id} className="flex items-center justify-between p-3.5 text-xs border border-[#EDE4E8] bg-white">
                    <div>
                      <b className="text-[#1F191D]">{fmtDate(a.start)}</b>
                      <div className="text-[10px] text-[#6E686F]">{a.serviceName}</div>
                    </div>
                    <StatusBadge status={a.status} />
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#EDE4E8] p-6 text-center text-xs text-[#888188]">
                <p>No upcoming appointments booked with {d.name}.</p>
                <Button
                  size="sm"
                  className="mt-3"
                  icon={<CalendarPlus className="size-3" />}
                  onClick={() => router.push("/client/appointments?new=1")}
                >
                  Book appointment
                </Button>
              </div>
            )}
          </SectionCard>
        </div>
      )}
      {tab === "sessions" && <SessionsView role="client" therapistId={id} embedded />}
      {tab === "appointments" && <AppointmentsView role="client" />}
      {tab === "tasks" && <TasksView role="client" />}
      {tab === "documents" && <DocumentsView role="client" />}
    </>
  );
}
