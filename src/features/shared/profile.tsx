"use client";
import { Download, KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { portalHome, useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Avatar, Card, SectionCard } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { EntityForm, type FieldDef } from "@/components/ui/entity-form";
import { CardSkeleton, ErrorState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useAction, useApiQuery } from "@/hooks/useResource";
import { cn } from "@/lib/cn";
import { api } from "@/services/api";
import type { Role } from "@/services/types";

type P = Record<string, unknown>;
const phone = z.string().regex(/^[+\d][\d\s-]{7,14}$/, "Enter a valid phone number");
const base = { name: z.string().min(2, "Enter your full name"), phone };
const schemas: Record<Role, z.ZodType> = {
  admin: z.object({ ...base, designation: z.string().min(2, "Enter your designation") }),
  therapist: z.object({
    ...base, specialization: z.string().min(2, "Enter your specialization"), license: z.string().min(3, "Enter your license number"),
    experience: z.number({ error: "Enter years" }).min(0).max(60), fee: z.number({ error: "Enter a fee" }).min(100, "Minimum ₹100"), languages: z.string().min(2, "Add at least one language"), bio: z.string().min(10, "Write a short bio (10+ characters)"),
  }),
  client: z.object({ ...base, age: z.number({ error: "Enter your age" }).min(10, "Must be 10 or older").max(110), gender: z.string().min(1, "Select one") }),
};
const gender = ["Female", "Male", "Non-binary", "Prefer not to say"].map((v) => ({ value: v, label: v }));
const fields: Record<Role, FieldDef[]> = {
  admin: [{ name: "name", label: "Full name" }, { name: "phone", label: "Phone", type: "tel" }, { name: "designation", label: "Designation", span: 2 }],
  therapist: [
    { name: "name", label: "Full name" }, { name: "phone", label: "Phone", type: "tel" }, { name: "specialization", label: "Specialization" }, { name: "license", label: "License / RCI number" },
    { name: "experience", label: "Experience (years)", type: "number", min: 0 }, { name: "fee", label: "Session fee (₹)", type: "number", min: 0 }, { name: "languages", label: "Languages", span: 2 }, { name: "bio", label: "About you", type: "textarea" },
  ],
  client: [{ name: "name", label: "Full name" }, { name: "phone", label: "Phone", type: "tel" }, { name: "age", label: "Age", type: "number", min: 10 }, { name: "gender", label: "Gender", type: "select", options: gender }],
};

function useProfile(role: Role) {
  const { user } = useAuth();
  const q = useApiQuery<P>(["profile", role, user?.id], "/profile", { role, id: user?.id, name: user?.name, email: user?.email });
  const save = useAction((v: P) => api.put("/profile", { role, id: user!.id, ...v }), ["profile", "therapists", "clients"]);
  return { q, save };
}
const defaults = (role: Role, d: P) => Object.fromEntries(fields[role].map((f) => [f.name, d[f.name] ?? (f.type === "number" ? undefined : "")]));

export function ProfileView({ role }: { role: Role }) {
  const { user, update, logout } = useAuth();
  const { q, save } = useProfile(role);
  const [tab, setTab] = useState("details");
  const { toast } = useToast(), confirm = useConfirm(), router = useRouter();
  if (!user) return null;
  const d = q.data;
  const pwd = z.object({ current: z.string().min(1, "Enter current password"), next: z.string().min(8, "At least 8 characters").regex(/\d/, "Include a number"), confirm: z.string() }).refine((v) => v.next === v.confirm, { path: ["confirm"], message: "Passwords do not match" });
  return (
    <>
      <PageHeader eyebrow="Account" title="Manage Profile" subtitle="Your personal details, security and privacy." />
      <Card hover={false} className="mb-4 flex items-center gap-4 p-5"><Avatar name={String(d?.name ?? user.name)} size={56} /><div><div className="text-base font-extrabold">{String(d?.name ?? user.name)}</div><div className="text-xs text-muted">{user.email} · {role[0].toUpperCase() + role.slice(1)}</div></div></Card>
      <Tabs className="mb-4 w-fit" value={tab} onChange={setTab} items={[{ id: "details", label: "Details" }, { id: "security", label: "Security" }, { id: "privacy", label: "Privacy & data" }]} />
      <div className="max-w-3xl">
        {tab === "details" && (q.isError ? <ErrorState onRetry={() => q.refetch()} /> : !d ? <CardSkeleton rows={4} /> : (
          <SectionCard title="Personal details"><EntityForm fields={fields[role]} schema={schemas[role]} defaultValues={defaults(role, d) as never} submitLabel="Save changes"
            onSubmit={async (v) => { try { await save.mutateAsync(v as P); update({ name: String((v as P).name) }); toast("Profile updated"); } catch (e) { toast(e instanceof Error ? e.message : "Could not save profile", "error"); } }} /></SectionCard>
        ))}
        {tab === "security" && (
          <SectionCard title="Change password" action={<KeyRound className="size-4 text-wine" />}>
            <EntityForm fields={[{ name: "current", label: "Current password", type: "password", span: 2 }, { name: "next", label: "New password", type: "password" }, { name: "confirm", label: "Confirm password", type: "password" }]} schema={pwd} defaultValues={{ current: "", next: "", confirm: "" }} submitLabel="Update password"
              onSubmit={async () => { await new Promise((r) => setTimeout(r, 600)); toast("Password updated"); }} />
          </SectionCard>
        )}
        {tab === "privacy" && (
          <SectionCard title="Your data (DPDPA)" action={<ShieldCheck className="size-4 text-wine" />}>
            <p className="mb-4 text-xs text-muted">You can export a copy of your personal data or request deletion of your account at any time. Clinical records are retained as required by law.</p>
            <div className={cn("flex flex-wrap gap-2")}>
              <Button variant="outline" icon={<Download className="size-3.5" />} onClick={() => {
                const url = URL.createObjectURL(new Blob([JSON.stringify({ account: user, profile: d }, null, 2)], { type: "application/json" }));
                const a = document.createElement("a"); a.href = url; a.download = "my-data.json"; a.click(); URL.revokeObjectURL(url); toast("Data export downloaded");
              }}>Download my data</Button>
              <Button variant="danger" icon={<Trash2 className="size-3.5" />} onClick={async () => { if (await confirm({ title: "Request account deletion?", description: "Your account will be scheduled for deletion and you will be signed out.", confirmLabel: "Request deletion", danger: true })) { toast("Deletion request submitted", "info"); logout(); router.replace("/login"); } }}>Request account deletion</Button>
            </div>
          </SectionCard>
        )}
      </div>
    </>
  );
}

export function ProfileSetup({ role }: { role: Role }) {
  const { user, update } = useAuth();
  const { save } = useProfile(role);
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [vals, setVals] = useState<P>({ name: user?.name ?? "" });
  const all = fields[role];
  const split = Math.ceil(all.length / 2);
  const groups = role === "admin" ? [all] : [all.slice(0, 2), all.slice(2)];
  const g = groups[step];
  const shape = (schemas[role] as unknown as z.ZodObject<Record<string, z.ZodType>>).shape;
  const stepSchema = z.object(Object.fromEntries(g.map((f) => [f.name, shape[f.name]])));
  void split;
  const last = step === groups.length - 1;
  const titles = ["About you", role === "therapist" ? "Professional details" : "A little more"];
  return (
    <div className="mx-auto max-w-xl py-10">
      <div className="mb-6 text-center"><h1 className="text-xl font-extrabold">Set up your profile</h1><p className="mt-1 text-xs text-muted">Step {step + 1} of {groups.length} · {titles[step] ?? titles[0]}</p>
        <div className="mx-auto mt-3 flex max-w-xs gap-1.5">{groups.map((_, i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-wine" : "bg-[#eadfe2]")} />)}</div></div>
      <Card hover={false} className="p-5">
        <EntityForm key={step} fields={g} schema={stepSchema} defaultValues={Object.fromEntries(g.map((f) => [f.name, vals[f.name] ?? (f.type === "number" ? undefined : "")])) as never} submitLabel={last ? "Finish setup" : "Continue"}
          onCancel={step > 0 ? () => setStep(step - 1) : undefined}
          onSubmit={async (v) => {
            const merged = { ...vals, ...(v as P) }; setVals(merged);
            if (!last) return setStep(step + 1);
            try { await save.mutateAsync(merged); update({ name: String(merged.name), profileComplete: true }); toast("Profile ready — welcome aboard!"); router.replace(portalHome[role]); }
            catch (e) { toast(e instanceof Error ? e.message : "Could not save profile", "error"); }
          }} />
      </Card>
    </div>
  );
}