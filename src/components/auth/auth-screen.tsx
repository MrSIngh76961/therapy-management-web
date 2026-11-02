"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { CheckCircle2, HeartPulse, Lock, Mail, ShieldCheck, Sparkles, User, Video } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { portalHome, useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import type { Role } from "@/services/types";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = loginSchema.extend({
  name: z.string().min(2, "Enter your full name"),
  terms: z.boolean().refine((v) => v, "Please accept the terms to continue"),
});

type LoginV = z.infer<typeof loginSchema>;
type SignupV = z.infer<typeof signupSchema>;

const roleTabs = [
  { id: "admin", label: "Clinic Owner" },
  { id: "therapist", label: "Therapist" },
  { id: "client", label: "Client" },
];

const demoEmail: Record<Role, string> = {
  admin: "kavita@theraflow.in",
  therapist: "aisha.sharma@theraflow.in",
  client: "riya.mehta@mail.com",
};

export function AuthScreen({ mode }: { mode: "login" | "signup" }) {
  const sp = useSearchParams();
  const router = useRouter();
  const { login, signup } = useAuth();
  const { toast } = useToast();
  const initial = (sp.get("role") as Role) || "therapist";
  const [role, setRole] = useState<Role>(mode === "signup" && initial === "admin" ? "therapist" : initial);
  const [formError, setFormError] = useState<string | null>(null);
  const [mapped, setMapped] = useState<Record<string, number> | null>(null);
  const isLogin = mode === "login";

  const form = useForm<SignupV>({
    resolver: zodResolver(isLogin ? loginSchema : signupSchema) as never,
    defaultValues: { email: "", password: "", name: "", terms: false },
    mode: "onTouched",
  });
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = async (v: LoginV & Partial<SignupV>) => {
    setFormError(null);
    try {
      if (isLogin) {
        await login(role, v.email, v.password);
        toast("Welcome back to TheraFlow");
        router.replace(portalHome[role]);
      } else {
        const res = await signup(role, {
          name: v.name ?? "",
          email: v.email,
          password: v.password,
          claimToken: sp.get("token") ?? undefined,
        });
        if (res.mapped) {
          setMapped(res.mapped);
          return;
        }
        toast("Account created successfully");
        router.replace(`${portalHome[role]}/profile-setup`);
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Something went wrong during sign-in.");
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Brand Hero Panel (Left) */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#71102F] via-[#98143F] to-[#b32b53] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        {/* Soft floating background ambient lights */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -right-20 -top-20 size-96 rounded-full bg-white/20 blur-3xl"
        />
        <motion.div
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.12, 0.22, 0.12] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -bottom-24 -left-20 size-[30rem] rounded-full bg-white/15 blur-3xl"
        />

        {/* Brand header */}
        <div className="relative flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-white shadow-md">
            <HeartPulse className="size-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight">TheraFlow</span>
            <div className="text-[10px] uppercase font-bold tracking-widest text-white/70">Therapy & Clinic Suite</div>
          </div>
        </div>

        {/* Feature value highlights */}
        <div className="relative max-w-lg my-auto py-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white/95 backdrop-blur-md border border-white/20 mb-6">
            <Sparkles className="size-3.5" />
            Healthcare SaaS Redesigned
          </div>
          <h2 className="text-4xl font-black leading-tight tracking-tight text-white drop-shadow-sm">
            Empowering modern therapy practices with calm, secure precision.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/85">
            Everything your clinical practice needs — from encrypted telehealth consultations to DPDPA-compliant consents, automated GST invoicing, and between-session care homework.
          </p>

          <ul className="mt-8 space-y-3.5 text-xs text-white/90">
            {[
              "Encrypted WebRTC video & audio consultation rooms",
              "Bilateral DPDPA 2023 compliance & consent logging",
              "Automated GST tax invoicing & UPI payment collection",
              "Between-session care tasks & clinical homework tracking",
            ].map((text) => (
              <li key={text} className="flex items-center gap-2.5">
                <div className="grid size-5 place-items-center rounded-full bg-white/20 text-white">
                  <CheckCircle2 className="size-3.5" />
                </div>
                <span className="font-medium">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Trust footer */}
        <div className="relative flex items-center justify-between border-t border-white/15 pt-6 text-xs text-white/75">
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-white" />
            DPDPA 2023 Ready · 256-Bit SSL Encrypted
          </span>
          <span className="text-[11px] text-white/60">Demo Sandbox Environment</span>
        </div>
      </div>

      {/* Form Surface (Right) */}
      <div className="flex items-center justify-center bg-canvas p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-[440px]"
        >
          {mapped ? (
            <div className="rounded-3xl border border-line bg-white p-7 text-center shadow-card">
              <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-mint text-ok shadow-xs">
                <CheckCircle2 className="size-8" />
              </div>
              <h1 className="text-xl font-black text-ink">We Found Your Existing Records!</h1>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                Your prior consultation records, homework tasks, and consent receipts have been safely consolidated into your permanent TheraFlow profile.
              </p>

              <div className="my-6 grid grid-cols-2 gap-3 text-left">
                {Object.entries(mapped).map(([k, n]) => (
                  <div key={k} className="rounded-2xl border border-line bg-warm-ivory p-3.5">
                    <div className="text-2xl font-black text-wine">{n}</div>
                    <div className="text-[11px] font-semibold capitalize text-muted">{k} linked</div>
                  </div>
                ))}
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={() => router.replace(`${portalHome[role]}/profile-setup`)}
              >
                Proceed to Profile Setup
              </Button>
            </div>
          ) : (
            <div className="rounded-3xl border border-line/70 bg-white p-7 sm:p-8 shadow-card">
              <div className="mb-6">
                <h1 className="text-2xl font-black tracking-tight text-ink">
                  {isLogin ? "Welcome back" : "Create your account"}
                </h1>
                <p className="mt-1 text-xs text-muted">
                  {isLogin
                    ? "Choose your role and sign in to your dedicated portal."
                    : "Join TheraFlow to start coordinating your care seamlessly."}
                </p>
              </div>

              {sp.get("expired") && (
                <div role="alert" className="mb-4 rounded-xl border border-warn/30 bg-[#fff8e6] p-3 text-xs font-semibold text-[#8c6b1b]">
                  Your session expired due to inactivity. Please sign in again to continue.
                </div>
              )}

              {/* Role selection tabs */}
              <div className="mb-6">
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted">
                  Select Portal Role
                </label>
                <Tabs
                  items={isLogin ? roleTabs : roleTabs.slice(1)}
                  value={role}
                  onChange={(r) => {
                    setRole(r as Role);
                    setFormError(null);
                  }}
                  className="w-full"
                />
              </div>

              <form onSubmit={handleSubmit(onSubmit as never)} noValidate className="space-y-4">
                {!isLogin && (
                  <Input
                    label="Full Name"
                    placeholder="e.g. Dr. Aisha Sharma"
                    leading={<User className="size-4 text-wine" />}
                    error={errors.name?.message}
                    {...register("name")}
                    autoComplete="name"
                  />
                )}

                <Input
                  label="Email Address"
                  type="email"
                  placeholder="name@clinic.com"
                  leading={<Mail className="size-4 text-wine" />}
                  error={errors.email?.message}
                  {...register("email")}
                  autoComplete="email"
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  leading={<Lock className="size-4 text-wine" />}
                  error={errors.password?.message}
                  hint={isLogin ? 'Demo: any 6+ characters. Type "wrong" to test error handling.' : undefined}
                  {...register("password")}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />

                {!isLogin && (
                  <label className="flex items-start gap-2.5 text-[11px] text-muted">
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded border-line text-wine focus:ring-wine"
                      {...register("terms")}
                    />
                    <span>
                      I agree to the <b className="text-ink">Terms of Service</b> and acknowledge data processing in accordance with the <b className="text-ink">DPDP Act 2023</b>.
                    </span>
                  </label>
                )}

                {errors.terms && (
                  <p role="alert" className="text-[10px] font-semibold text-bad">
                    {errors.terms.message}
                  </p>
                )}

                {formError && (
                  <p role="alert" className="rounded-xl border border-bad/20 bg-coral p-3 text-xs font-semibold text-bad">
                    {formError}
                  </p>
                )}

                <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
                  {isLogin ? "Sign In to Portal" : "Create TheraFlow Account"}
                </Button>

                {isLogin && (
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      type="button"
                      className="font-bold text-wine hover:underline"
                      onClick={() => {
                        setValue("email", demoEmail[role]);
                        setValue("password", "demo1234");
                        toast("Demo credentials filled for " + role, "info");
                      }}
                    >
                      Use Demo Account
                    </button>
                    <button
                      type="button"
                      className="font-medium text-muted hover:text-wine"
                      onClick={() => toast("Password reset link dispatched (simulated)", "info")}
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
              </form>

              <div className="mt-6 border-t border-line/60 pt-4 text-center text-xs text-muted">
                {isLogin ? "New to TheraFlow? " : "Already have an account? "}
                <Link
                  className="font-bold text-wine hover:underline"
                  href={`${isLogin ? "/signup" : "/login"}?role=${role}`}
                >
                  {isLogin ? "Create an account" : "Sign in here"}
                </Link>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
