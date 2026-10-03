"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { CheckCircle2, Lock, Mail, ShieldCheck, User } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { portalHome, useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import type { Role } from "@/services/types";

const loginSchema = z.object({ email: z.string().email("Enter a valid email address"), password: z.string().min(6, "Password must be at least 6 characters") });
const signupSchema = loginSchema.extend({ name: z.string().min(2, "Enter your full name"), terms: z.boolean().refine((v) => v, "Please accept the terms to continue") });
type LoginV = z.infer<typeof loginSchema>;
type SignupV = z.infer<typeof signupSchema>;

const roleTabs = [{ id: "admin", label: "Clinic Owner" }, { id: "therapist", label: "Therapist" }, { id: "client", label: "Client" }];
const demoEmail: Record<Role, string> = { admin: "kavita@theraflow.in", therapist: "aisha.sharma@theraflow.in", client: "riya.mehta@mail.com" };

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

  const form = useForm<SignupV>({ resolver: zodResolver(isLogin ? loginSchema : signupSchema) as never, defaultValues: { email: "", password: "", name: "", terms: false }, mode: "onTouched" });
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = form;

  const onSubmit = async (v: LoginV & Partial<SignupV>) => {
    setFormError(null);
    try {
      if (isLogin) { await login(role, v.email, v.password); toast("Welcome back"); router.replace(portalHome[role]); }
      else {
        const res = await signup(role, { name: v.name ?? "", email: v.email, password: v.password, claimToken: sp.get("token") ?? undefined });
        if (res.mapped) { setMapped(res.mapped); return; }
        toast("Account created"); router.replace(`${portalHome[role]}/profile-setup`);
      }
    } catch (e) { setFormError(e instanceof Error ? e.message : "Something went wrong"); }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-wine via-[#9c2347] to-[#d15d7d] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 12, repeat: Infinity }} className="absolute -right-24 -top-24 size-96 rounded-full bg-white/10" />
        <motion.div animate={{ scale: [1.05, 1, 1.05] }} transition={{ duration: 14, repeat: Infinity }} className="absolute -bottom-32 -left-20 size-[28rem] rounded-full bg-white/10" />
        <div className="relative flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl bg-white/20 text-lg font-extrabold backdrop-blur">T</div><b className="text-lg">TheraFlow</b></div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight">Care, connection and clarity — in one calm workspace.</h2>
          <ul className="mt-6 space-y-3 text-sm text-white/85">
            {["Secure video, audio & chat sessions", "DPDPA-aware consent workflows", "Invoices, receipts and UPI payments"].map((t) => <li key={t} className="flex items-center gap-2"><CheckCircle2 className="size-4" />{t}</li>)}
          </ul>
        </div>
        <p className="relative flex items-center gap-2 text-xs text-white/70"><ShieldCheck className="size-4" />Demo environment — data is simulated.</p>
      </div>

      <div className="flex items-center justify-center p-5 sm:p-10">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="w-full max-w-[420px]">
          {mapped ? (
            <div className="text-center">
              <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-[#e9f7f0] text-ok"><CheckCircle2 className="size-7" /></div>
              <h1 className="text-xl font-extrabold">We found your existing records</h1>
              <p className="mt-2 text-xs text-muted">Your earlier activity was securely linked to your new account.</p>
              <div className="my-5 grid grid-cols-2 gap-2 text-left">
                {Object.entries(mapped).map(([k, n]) => <div key={k} className="rounded-xl border border-line bg-white p-3"><div className="text-xl font-extrabold text-wine">{n}</div><div className="text-[10px] capitalize text-muted">{k} linked</div></div>)}
              </div>
              <Button className="w-full" size="lg" onClick={() => router.replace(`${portalHome[role]}/profile-setup`)}>Continue to profile setup</Button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold tracking-[-0.03em]">{isLogin ? "Welcome back" : "Create your account"}</h1>
              <p className="mb-5 mt-1 text-xs text-muted">{isLogin ? "Sign in to your TheraFlow portal." : "Join TheraFlow in under a minute."}</p>
              {sp.get("expired") && <p role="alert" className="mb-3 rounded-lg bg-[#fff6df] px-3 py-2 text-xs text-[#966d1c]">Your session expired due to inactivity. Please sign in again.</p>}
              <Tabs items={isLogin ? roleTabs : roleTabs.slice(1)} value={role} onChange={(r) => { setRole(r as Role); setFormError(null); }} className="mb-5" />
              <form onSubmit={handleSubmit(onSubmit as never)} noValidate className="space-y-3.5">
                {!isLogin && <Input label="Full name" leading={<User className="size-4" />} error={errors.name?.message} {...register("name")} autoComplete="name" />}
                <Input label="Email" type="email" leading={<Mail className="size-4" />} error={errors.email?.message} {...register("email")} autoComplete="email" />
                <Input label="Password" type="password" leading={<Lock className="size-4" />} error={errors.password?.message} hint={isLogin ? 'Demo: use any password (6+ chars). "wrong" simulates an error.' : undefined} {...register("password")} autoComplete={isLogin ? "current-password" : "new-password"} />
                {!isLogin && (
                  <label className="flex items-start gap-2 text-[11px] text-muted"><input type="checkbox" className="mt-0.5 accent-[#861637]" {...register("terms")} /><span>I agree to the Terms and the Privacy Policy, including processing under the DPDP Act.</span></label>
                )}
                {errors.terms && <p role="alert" className="text-[10px] font-semibold text-bad">{errors.terms.message}</p>}
                {formError && <p role="alert" className="rounded-lg bg-[#fdecee] px-3 py-2 text-xs font-semibold text-bad">{formError}</p>}
                <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>{isLogin ? "Sign in" : "Create account"}</Button>
                {isLogin && (
                  <div className="flex items-center justify-between text-[11px]">
                    <button type="button" className="font-semibold text-wine hover:underline" onClick={() => { setValue("email", demoEmail[role]); setValue("password", "demo1234"); toast("Demo credentials filled", "info"); }}>Use demo account</button>
                    <button type="button" className="text-muted hover:text-wine" onClick={() => toast("Password reset link sent (simulated)", "info")}>Forgot password?</button>
                  </div>
                )}
              </form>
              <p className="mt-6 text-center text-xs text-muted">
                {isLogin ? "New here? " : "Already registered? "}
                <Link className="font-bold text-wine hover:underline" href={`${isLogin ? "/signup" : "/login"}?role=${role}`}>{isLogin ? "Create an account" : "Sign in"}</Link>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
