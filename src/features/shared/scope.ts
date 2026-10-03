import { useAuth } from "@/components/auth/auth-provider";
import type { Role } from "@/services/types";

/** Query scope that mimics server-side row filtering by the authenticated principal. */
export function useScope(role: Role): Record<string, string | undefined> {
  const { user } = useAuth();
  return role === "therapist" ? { therapistId: user?.id } : role === "client" ? { clientId: user?.id } : {};
}