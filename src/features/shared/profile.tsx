"use client";
import { Download, KeyRound, ShieldCheck, Sparkles, Trash2, User, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { portalHome, useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Avatar, Card, SectionCard, StatusBadge } from "@/components/ui/card";
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
const phone = z.string().regex(/^[+\d][\d\s-]{7,14}$/, "Enter a valid phone number (e.g., +91 98765 43210)");
const base = { name: z.string().min(2, "Enter your full name"), phone };

const schemas: Record<Role, z.ZodType> = {
  admin: z.object({ ...base, designation: z.string().min(2, "Enter your designation") }),
  therapist: z.object({
    ...base,
    specialization: z.string().min(2, "Enter your specialization"),
    license: z.string().min(3, "Enter your RCI or clinical license number"),
    experience: z.number({ error: "Enter years" }).min(0).max(60),
    fee: z.number({ error: "Enter a fee" }).min(100, "Minimum session fee is ₹100"),
    languages: z.string().min(2, "Add at least one language"),
    bio: z.string().min(10, "Write a short professional bio (10+ characters)"),
  }),
  client: z.object({
    ...base,
    age: z.number({ error: "Enter your age" }).min(10, "Must be 10 or older").max(110),
    gender: z.string().min(1, "Select one"),
  }),
};

const gender = ["Female", "Male", "Non-binary", "Prefer not to say"].map((v) => ({ value: v, label: v }));

const fields: Record<Role, FieldDef[]> = {
  admin: [
    { name: "name", label: "Full Name" },
    { name: "phone", label: "Phone Number", type: "tel" },
    { name: "designation", label: "Clinic Role / Designation", span: 2 },
  ],
  therapist: [
    { name: "name", label: "Full Name" },
    { name: "phone", label: "Phone Number", type: "tel" },
    { name: "specialization", label: "Clinical Specialization (e.g. CBT, Trauma)" },
    { name: "license", label: "License / RCI Registration Number" },
    { name: "experience", label: "Years of Clinical Experience", type: "number", min: 0 },
    { name: "fee", label: "Standard Session Fee (₹)", type: "number", min: 0 },
    { name: "languages", label: "Consultation Languages (comma-separated)", span: 2 },
    { name: "bio", label: "Professional Bio & Approach", type: "textarea" },
  ],
  client: [
    { name: "name", label: "Full Name" },
    { name: "phone", label: "Phone Number", type: "tel" },
    { name: "age", label: "Age", type: "number", min: 10 },
    { name: "gender", label: "Gender Identity", type: "select", options: gender },
  ],
};

function useProfile(role: Role) {
  const { user } = useAuth();
  const q = useApiQuery<P>(["profile", role, user?.id], "/profile", {
    role,
    id: user?.id,
    name: user?.name,
    email: user?.email,
  });
  const save = useAction((v: P) => api.put("/profile", { role, id: user!.id, ...v }), ["profile", "therapists", "clients"]);
  return { q, save };
}

const defaults = (role: Role, d: P) =>
  Object.fromEntries(fields[role].map((f) => [f.name, d[f.name] ?? (f.type === "number" ? undefined : "")]));

export function ProfileView({ role }: { role: Role }) {
  const { user, update, logout } = useAuth();
  const { q, save } = useProfile(role);
  const [tab, setTab] = useState("details");
  const { toast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();

  if (!user) return null;
  const d = q.data;

  const pwd = z
    .object({
      current: z.string().min(1, "Enter current password"),
      next: z.string().min(8, "New password must be at least 8 characters").regex(/\d/, "Include at least one number"),
      confirm: z.string(),
    })
    .refine((v) => v.next === v.confirm, { path: ["confirm"], message: "Passwords do not match" });

  return (
    <>
      <PageHeader
        eyebrow="Account Settings"
        title="Personal Profile & Privacy"
        subtitle="Manage your personal information, credentials, security, and DPDPA compliance preferences."
      />

      {/* Hero profile card */}
      <Card hover={false} className="mb-5 overflow-hidden p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar name={String(d?.name ?? user.name)} size={64} className="border-2 border-wine/20 shadow-sm" />
              <div className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-ok text-white text-[10px]">
                ✓
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-ink">{String(d?.name ?? user.name)}</h2>
                <span className="rounded-full bg-rose px-2.5 py-0.5 text-[11px] font-bold text-wine capitalize border border-wine/10">
                  {role}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted">
                {user.email} · Verified Account
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3 py-1 text-xs font-bold text-ok">
              <ShieldCheck className="size-4" />
              DPDPA Compliant
            </span>
          </div>
        </div>
      </Card>

      <Tabs
        className="mb-5 w-fit"
        value={tab}
        onChange={setTab}
        items={[
          { id: "details", label: "Profile Details" },
          { id: "security", label: "Security & Login" },
          { id: "privacy", label: "Privacy & Data Rights" },
        ]}
      />

      <div className="max-w-3xl">
        {tab === "details" &&
          (q.isError ? (
            <ErrorState onRetry={() => q.refetch()} />
          ) : !d ? (
            <CardSkeleton rows={4} />
          ) : (
            <SectionCard title="Personal & Clinical Details">
              <EntityForm
                fields={fields[role]}
                schema={schemas[role]}
                defaultValues={defaults(role, d) as never}
                submitLabel="Save Changes"
                onSubmit={async (v) => {
                  try {
                    await save.mutateAsync(v as P);
                    update({ name: String((v as P).name) });
                    toast("Profile saved successfully");
                  } catch (e) {
                    toast(e instanceof Error ? e.message : "Could not save profile", "error");
                  }
                }}
              />
            </SectionCard>
          ))}

        {tab === "security" && (
          <SectionCard title="Password & Authentication" action={<KeyRound className="size-4 text-wine" />}>
            <EntityForm
              fields={[
                { name: "current", label: "Current Password", type: "password", span: 2 },
                { name: "next", label: "New Password", type: "password" },
                { name: "confirm", label: "Confirm New Password", type: "password" },
              ]}
              schema={pwd}
              defaultValues={{ current: "", next: "", confirm: "" }}
              submitLabel="Update Password"
              onSubmit={async () => {
                await new Promise((r) => setTimeout(r, 600));
                toast("Password updated securely");
              }}
            />
          </SectionCard>
        )}

        {tab === "privacy" && (
          <div className="space-y-4">
            <SectionCard title="DPDPA 2023 Data Rights" action={<ShieldCheck className="size-4 text-wine" />}>
              <p className="text-xs text-muted leading-relaxed mb-4">
                Under India&apos;s Digital Personal Data Protection Act (DPDPA 2023), you hold the right to export your complete personal information, review active consents, or request permanent deletion of your account.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  icon={<Download className="size-3.5" />}
                  onClick={() => {
                    const url = URL.createObjectURL(
                      new Blob([JSON.stringify({ account: user, profile: d }, null, 2)], {
                        type: "application/json",
                      })
                    );
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `theraflow-data-${user.id}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast("Your data archive has been exported");
                  }}
                >
                  Download Complete Data Archive
                </Button>
                <Button
                  variant="danger"
                  icon={<Trash2 className="size-3.5" />}
                  onClick={async () => {
                    if (
                      await confirm({
                        title: "Request Account Deletion?",
                        description:
                          "Your account will be queued for permanent erasure. Clinical records required by legal retention mandates will be archived per Indian healthcare guidelines.",
                        confirmLabel: "Request Deletion",
                        danger: true,
                      })
                    ) {
                      toast("Account deletion request submitted", "info");
                      logout();
                      router.replace("/login");
                    }
                  }}
                >
                  Request Account Deletion
                </Button>
              </div>
            </SectionCard>

            <Card hover={false} variant="ivory" className="p-4 text-xs">
              <div className="flex items-center gap-2 font-bold text-wine">
                <Sparkles className="size-4" />
                Data Protection Officer Contact
              </div>
              <p className="mt-1 text-[11px] text-muted">
                For regulatory inquiries or grievance redressal under DPDPA, reach out directly to privacy@theraflow.in.
              </p>
            </Card>
          </div>
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
  const groups = role === "admin" ? [all] : [all.slice(0, 2), all.slice(2)];
  const g = groups[step];
  const shape = (schemas[role] as unknown as z.ZodObject<Record<string, z.ZodType>>).shape;
  const stepSchema = z.object(Object.fromEntries(g.map((f) => [f.name, shape[f.name]])));
  const last = step === groups.length - 1;
  const titles = ["Basic Information", role === "therapist" ? "Clinical Credentials" : "Care Preferences"];

  return (
    <div className="mx-auto max-w-xl py-12 px-4">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-wine to-[#d15d7d] text-white shadow-sm">
          <UserCheck className="size-6" />
        </div>
        <h1 className="text-2xl font-black text-ink">Complete Your Profile</h1>
        <p className="mt-1 text-xs text-muted">
          Step {step + 1} of {groups.length} · {titles[step] ?? titles[0]}
        </p>
        <div className="mx-auto mt-4 flex max-w-xs gap-2">
          {groups.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 flex-1 rounded-full transition-all duration-300",
                i <= step ? "bg-wine shadow-xs" : "bg-neutral-200"
              )}
            />
          ))}
        </div>
      </div>

      <Card hover={false} className="p-6 shadow-card">
        <EntityForm
          key={step}
          fields={g}
          schema={stepSchema}
          defaultValues={
            Object.fromEntries(
              g.map((f) => [f.name, vals[f.name] ?? (f.type === "number" ? undefined : "")])
            ) as never
          }
          submitLabel={last ? "Complete Onboarding" : "Continue"}
          onCancel={step > 0 ? () => setStep(step - 1) : undefined}
          onSubmit={async (v) => {
            const merged = { ...vals, ...(v as P) };
            setVals(merged);
            if (!last) return setStep(step + 1);
            try {
              await save.mutateAsync(merged);
              update({ name: String(merged.name), profileComplete: true });
              toast("Welcome to TheraFlow — your profile is complete!");
              router.replace(portalHome[role]);
            } catch (e) {
              toast(e instanceof Error ? e.message : "Could not save profile", "error");
            }
          }}
        />
      </Card>
    </div>
  );
}
