"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import { ApiError } from "@/services/http";
import type { Role, SessionUser } from "@/services/types";
import { ME } from "@/services/mock/db";

const KEY = "tf_session";
const demo: Record<Role, SessionUser> = {
  admin: { id: "u1", name: "Dr. Kavita Rao", email: "kavita@theraflow.in", role: "admin", profileComplete: true, accessMode: "account" },
  therapist: { id: ME.therapistId, name: ME.therapistName, email: "aisha.sharma@theraflow.in", role: "therapist", profileComplete: true, accessMode: "account" },
  client: { id: ME.clientId, name: ME.clientName, email: "riya.mehta@mail.com", role: "client", profileComplete: true, accessMode: "account" },
};
export const portalHome: Record<Role, string> = { admin: "/admin", therapist: "/therapist", client: "/client" };

interface Auth {
  user: SessionUser | null; ready: boolean;
  login(role: Role, email: string, password: string): Promise<SessionUser>;
  signup(role: Role, input: { name: string; email: string; password: string; claimToken?: string }): Promise<{ user: SessionUser; mapped?: Record<string, number> | null }>;
  update(patch: Partial<SessionUser>): void;
  logout(): void;
}
const Ctx = createContext<Auth | null>(null);
export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { const raw = sessionStorage.getItem(KEY); if (raw) setUser(JSON.parse(raw)); } catch { /* ignore corrupt session */ }
    setReady(true);
  }, []);
  const persist = useCallback((u: SessionUser | null) => {
    setUser(u);
    if (u) sessionStorage.setItem(KEY, JSON.stringify(u)); else sessionStorage.removeItem(KEY);
  }, []);

  const value = useMemo<Auth>(() => ({
    user, ready,
    async login(role, email, password) {
      await new Promise((r) => setTimeout(r, 600));
      if (password === "wrong") throw new ApiError(401, "Incorrect email or password.");
      const base = demo[role];
      const u = { ...base, email: email || base.email };
      persist(u);
      return u;
    },
    async signup(role, input) {
      await new Promise((r) => setTimeout(r, 700));
      let mapped: Record<string, number> | null | undefined;
      let id = `new_${Math.random().toString(36).slice(2, 8)}`;
      let name = input.name;
      if (role === "client") {
        const res = await api.post<{ clientId?: string; name?: string; mapped: Record<string, number> | null }>("/auth/claim", { email: input.email, token: input.claimToken });
        mapped = res.mapped;
        if (res.clientId) { id = res.clientId; name = res.name ?? name; }
      }
      const u: SessionUser = { id, name, email: input.email, role, profileComplete: false, accessMode: "account" };
      persist(u);
      return { user: u, mapped };
    },
    update: (patch) => user && persist({ ...user, ...patch }),
    logout: () => persist(null),
  }), [user, ready, persist]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
