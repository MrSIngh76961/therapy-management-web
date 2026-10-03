"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellOff, CalendarClock, CheckCheck, ClipboardCheck, CreditCard, MessageSquare, Megaphone, Settings2, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Button, IconButton } from "@/components/ui/button";
import { Card, SectionCard } from "@/components/ui/card";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { Switch } from "@/components/ui/form";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useCreate, useList, useRemove, useUpdate } from "@/hooks/useResource";
import { cn } from "@/lib/cn";
import { fmtDateTime } from "@/lib/format";
import type { AppNotification, Role } from "@/services/types";
import { FormDialog } from "./form-dialog";
import { useAction } from "@/hooks/useResource";
import { api } from "@/services/api";

const icons = { appointment: CalendarClock, payment: CreditCard, consent: ShieldCheck, system: Bell, task: ClipboardCheck, message: MessageSquare };
const announce = z.object({ audience: z.enum(["therapist", "client", "admin"]), title: z.string().min(3, "Add a title"), body: z.string().min(5, "Write a short message") });
const prefTypes = ["Appointment reminders", "Payment updates", "Consent requests", "Task updates", "System announcements"];

export function NotificationsView({ role }: { role: Role }) {
  const [tab, setTab] = useState("all");
  const [type, setType] = useState("");
  const [compose, setCompose] = useState(false);
  const [prefs, setPrefs] = useState(false);
  const [on, setOn] = useState<Record<string, boolean>>(Object.fromEntries(prefTypes.map((p) => [p, true])));
  const { toast } = useToast();
  const q = useList("notifications", { audience: role, sort: "time", dir: "desc", type: type || undefined });
  const update = useUpdate("notifications"), remove = useRemove("notifications"), create = useCreate("notifications");
  const markAll = useAction(async (ids: string[]) => { await Promise.all(ids.map((id) => api.patch(`/notifications/${id}`, { read: true }))); }, ["notifications"]);
  const items = (q.data ?? []).filter((n) => tab === "all" || !n.read);
  const unread = (q.data ?? []).filter((n) => !n.read);

  return (
    <>
      <PageHeader eyebrow="Inbox" title="Notifications" subtitle="Appointments, payments, consent and system updates." actions={<>
        <Button variant="outline" icon={<Settings2 className="size-3.5" />} onClick={() => setPrefs(true)}>Preferences</Button>
        {role === "admin" && <Button variant="outline" icon={<Megaphone className="size-3.5" />} onClick={() => setCompose(true)}>Announcement</Button>}
        <Button icon={<CheckCheck className="size-3.5" />} disabled={!unread.length} loading={markAll.isPending} onClick={async () => { await markAll.mutateAsync(unread.map((n) => n.id)); toast("All notifications marked as read"); }}>Mark all read</Button></>} />
      <Card hover={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-3">
          <Tabs value={tab} onChange={setTab} items={[{ id: "all", label: "All" }, { id: "unread", label: "Unread", count: unread.length }]} />
          <select aria-label="Type" value={type} onChange={(e) => setType(e.target.value)} className="rounded-[10px] border border-line bg-white px-3 py-2.5 text-xs">
            <option value="">All types</option>{Object.keys(icons).map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div className="p-3">
          {q.isLoading ? <CardSkeleton rows={5} /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : items.length === 0 ? (
            <EmptyState icon={<BellOff className="size-6" />} title={tab === "unread" ? "You're all caught up" : "No notifications"} description="New alerts will show up here." />
          ) : (
            <ul className="space-y-2"><AnimatePresence initial={false}>
              {items.map((n: AppNotification) => { const I = icons[n.type]; return (
                <motion.li key={n.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 30 }} className={cn("flex items-start gap-3 rounded-xl border p-3 transition-colors hover:border-[#d9bbc4]", n.read ? "border-[#eee7e8] bg-white" : "border-[#ecc9d3] bg-[#fffafb]")}>
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", n.read ? "bg-[#f3eeee] text-[#888]" : "bg-rose text-wine")}><I className="size-4" /></span>
                  <div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-xs font-bold">{n.title}{!n.read && <span className="size-1.5 rounded-full bg-wine" aria-label="Unread" />}</div><p className="text-[11px] text-muted">{n.body}</p><div className="mt-1 text-[10px] text-[#aaa]">{fmtDateTime(n.time)}</div></div>
                  {!n.read && <Button size="sm" variant="soft" onClick={() => update.mutate({ id: n.id, read: true })}>Mark read</Button>}
                  <IconButton label="Delete notification" onClick={() => remove.mutate(n.id, { onSuccess: () => toast("Notification removed", "info") })}><Trash2 className="size-3.5" /></IconButton>
                </motion.li>); })}
            </AnimatePresence></ul>
          )}
        </div>
      </Card>
      <FormDialog<{ audience: Role; title: string; body: string }> open={compose} onClose={() => setCompose(false)} title="Send announcement" description="Delivered through the NotificationProvider (in-app now; email/SMS/push later)." submitLabel="Send"
        fields={[{ name: "audience", label: "Audience", type: "select", options: [{ value: "therapist", label: "All therapists" }, { value: "client", label: "All clients" }, { value: "admin", label: "Clinic staff" }] }, { name: "title", label: "Title", span: 2 }, { name: "body", label: "Message", type: "textarea" }]}
        schema={announce} defaultValues={{ audience: "therapist", title: "", body: "" }} successMessage="Announcement sent"
        onSubmit={(v) => create.mutateAsync({ ...v, type: "system", read: false, time: new Date().toISOString() })} />
      <FormDialogPrefs open={prefs} onClose={() => setPrefs(false)} on={on} setOn={setOn} />
    </>
  );
}

import { Modal } from "@/components/ui/overlay";
function FormDialogPrefs({ open, onClose, on, setOn }: { open: boolean; onClose: () => void; on: Record<string, boolean>; setOn: (v: Record<string, boolean>) => void }) {
  const { toast } = useToast();
  return (
    <Modal open={open} onClose={onClose} title="Notification preferences" description="Choose what you get notified about." footer={<Button onClick={() => { toast("Preferences saved"); onClose(); }}>Save</Button>}>
      <SectionCard>
        <ul className="divide-y divide-line">{prefTypes.map((p) => <li key={p} className="flex items-center justify-between py-3 text-xs font-semibold">{p}<Switch label={p} checked={on[p]} onChange={(v) => setOn({ ...on, [p]: v })} /></li>)}</ul>
      </SectionCard>
    </Modal>
  );
}