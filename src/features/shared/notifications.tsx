"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellOff, CalendarClock, CheckCheck, ClipboardCheck, CreditCard, Megaphone, MessageSquare, Settings2, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Button, IconButton } from "@/components/ui/button";
import { Card, SectionCard } from "@/components/ui/card";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { Switch } from "@/components/ui/form";
import { Modal } from "@/components/ui/overlay";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useAction, useCreate, useList, useRemove, useUpdate } from "@/hooks/useResource";
import { cn } from "@/lib/cn";
import { fmtDateTime } from "@/lib/format";
import { api } from "@/services/api";
import type { AppNotification, Role } from "@/services/types";
import { FormDialog } from "./form-dialog";

const icons: Record<string, { icon: typeof Bell; bg: string; text: string }> = {
  appointment: { icon: CalendarClock, bg: "bg-soft-blue", text: "text-info" },
  payment: { icon: CreditCard, bg: "bg-mint", text: "text-ok" },
  consent: { icon: ShieldCheck, bg: "bg-rose", text: "text-wine" },
  system: { icon: Bell, bg: "bg-lavender", text: "text-[#6b21a8]" },
  task: { icon: ClipboardCheck, bg: "bg-coral", text: "text-[#c2410c]" },
  message: { icon: MessageSquare, bg: "bg-rose", text: "text-wine" },
};

const announce = z.object({
  audience: z.enum(["therapist", "client", "admin"]),
  title: z.string().min(3, "Add a descriptive title"),
  body: z.string().min(5, "Write an announcement message"),
});

const prefTypes = [
  "Appointment reminders & schedule changes",
  "Payment receipts & billing updates",
  "DPDPA 2023 consent requests & notices",
  "Homework tasks & care plan assignments",
  "System announcements & policy notices",
];

export function NotificationsView({ role }: { role: Role }) {
  const [tab, setTab] = useState("all");
  const [type, setType] = useState("");
  const [compose, setCompose] = useState(false);
  const [prefs, setPrefs] = useState(false);
  const [on, setOn] = useState<Record<string, boolean>>(Object.fromEntries(prefTypes.map((p) => [p, true])));
  const { toast } = useToast();
  const q = useList("notifications", { audience: role, sort: "time", dir: "desc", type: type || undefined });
  const update = useUpdate("notifications");
  const remove = useRemove("notifications");
  const create = useCreate("notifications");
  const markAll = useAction(
    async (ids: string[]) => {
      await Promise.all(ids.map((id) => api.patch(`/notifications/${id}`, { read: true })));
    },
    ["notifications"]
  );

  const items = (q.data ?? []).filter((n) => tab === "all" || !n.read);
  const unread = (q.data ?? []).filter((n) => !n.read);

  return (
    <>
      <PageHeader
        eyebrow="Activity Center"
        title="Notifications & Alerts"
        subtitle="Real-time alerts for appointments, care homework, payments, and compliance notices."
        actions={
          <>
            <Button variant="outline" icon={<Settings2 className="size-3.5" />} onClick={() => setPrefs(true)}>
              Preferences
            </Button>
            {role === "admin" && (
              <Button variant="outline" icon={<Megaphone className="size-3.5" />} onClick={() => setCompose(true)}>
                Broadcast Announcement
              </Button>
            )}
            <Button
              icon={<CheckCheck className="size-3.5" />}
              disabled={!unread.length}
              loading={markAll.isPending}
              onClick={async () => {
                await markAll.mutateAsync(unread.map((n) => n.id));
                toast("All notifications marked as read");
              }}
            >
              Mark All Read
            </Button>
          </>
        }
      />

      <Card hover={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-warm-ivory/55 p-4">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: "all", label: "All Alerts" },
              { id: "unread", label: "Unread", count: unread.length },
            ]}
          />
          <select
            aria-label="Filter by notification type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink outline-none focus:border-wine"
          >
            <option value="">All Categories</option>
            {Object.keys(icons).map((t) => (
              <option key={t} value={t}>
                {t[0].toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="p-4">
          {q.isLoading ? (
            <CardSkeleton rows={5} />
          ) : q.isError ? (
            <ErrorState onRetry={() => q.refetch()} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<BellOff className="size-7 text-wine" />}
              title={tab === "unread" ? "You're all caught up!" : "No notifications"}
              description="New appointment alerts, reminders, and payment receipts will arrive here."
            />
          ) : (
            <ul className="space-y-2.5">
              <AnimatePresence initial={false}>
                {items.map((n: AppNotification) => {
                  const conf = icons[n.type] || icons.system;
                  const IconComp = conf.icon;
                  return (
                    <motion.li
                      key={n.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 24 }}
                      className={cn(
                        "flex items-start gap-3.5 rounded-2xl border p-4 transition-all duration-200",
                        n.read
                          ? "border-line/70 bg-white hover:border-wine/25"
                          : "border-wine/25 bg-gradient-to-r from-rose/40 via-white to-warm-ivory/55 shadow-xs"
                      )}
                    >
                      <div className={cn("grid size-10 shrink-0 place-items-center rounded-xl font-bold shadow-xs", conf.bg, conf.text)}>
                        <IconComp className="size-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-extrabold text-ink">{n.title}</h4>
                          {!n.read && (
                            <span className="size-2 rounded-full bg-wine animate-pulse" aria-label="Unread alert" />
                          )}
                        </div>
                        <p className="mt-1 text-xs text-ink/75 leading-relaxed">{n.body}</p>
                        <div className="mt-1.5 text-[10px] font-medium text-muted">{fmtDateTime(n.time)}</div>
                      </div>

                      <div className="flex items-center gap-1.5 self-center">
                        {!n.read && (
                          <Button size="sm" variant="soft" onClick={() => update.mutate({ id: n.id, read: true })}>
                            Mark Read
                          </Button>
                        )}
                        <IconButton
                          label="Delete notification"
                          onClick={() =>
                            remove.mutate(n.id, {
                              onSuccess: () => toast("Notification removed", "info"),
                            })
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </IconButton>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </Card>

      <FormDialog<{ audience: Role; title: string; body: string }>
        open={compose}
        onClose={() => setCompose(false)}
        title="Broadcast System Announcement"
        description="Dispatched across the notification hub to selected portal roles."
        submitLabel="Send Broadcast"
        fields={[
          {
            name: "audience",
            label: "Target Role",
            type: "select",
            options: [
              { value: "therapist", label: "All Therapists" },
              { value: "client", label: "All Clients" },
              { value: "admin", label: "Clinic Staff & Admins" },
            ],
          },
          { name: "title", label: "Announcement Title", span: 2 },
          { name: "body", label: "Message Content", type: "textarea" },
        ]}
        schema={announce}
        defaultValues={{ audience: "therapist", title: "", body: "" }}
        successMessage="Announcement broadcasted successfully"
        onSubmit={(v) => create.mutateAsync({ ...v, type: "system", read: false, time: new Date().toISOString() })}
      />

      <FormDialogPrefs open={prefs} onClose={() => setPrefs(false)} on={on} setOn={setOn} />
    </>
  );
}

function FormDialogPrefs({
  open,
  onClose,
  on,
  setOn,
}: {
  open: boolean;
  onClose: () => void;
  on: Record<string, boolean>;
  setOn: (v: Record<string, boolean>) => void;
}) {
  const { toast } = useToast();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Notification Preferences"
      description="Configure which updates you receive across in-app, SMS, and email."
      footer={
        <Button
          onClick={() => {
            toast("Preferences saved");
            onClose();
          }}
        >
          Save Preferences
        </Button>
      }
    >
      <div className="space-y-1 divide-y divide-line">
        {prefTypes.map((p) => (
          <div key={p} className="flex items-center justify-between py-3.5 text-xs font-semibold text-ink">
            <span className="max-w-[80%]">{p}</span>
            <Switch label={p} checked={on[p]} onChange={(v) => setOn({ ...on, [p]: v })} />
          </div>
        ))}
      </div>
    </Modal>
  );
}
