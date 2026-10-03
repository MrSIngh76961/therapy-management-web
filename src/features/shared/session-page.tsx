"use client";
import { useParams } from "next/navigation";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { useItem } from "@/hooks/useResource";
import { SessionRoom } from "./session-room";

export function SessionRoomPage({ role }: { role: "therapist" | "client" }) {
  const { id } = useParams<{ id: string }>();
  const q = useItem("appointments", id);
  const a = q.data;
  const exit = `/${role}`;
  if (q.isError) return <><PageHeader back={{ href: `/${role}/appointments`, label: "Appointments" }} title="Take session" /><ErrorState message="This session could not be found." onRetry={() => q.refetch()} /></>;
  if (!a) return <Skeleton className="mx-auto h-72 max-w-4xl" />;
  if (["cancelled", "no_show"].includes(a.status)) return <><PageHeader back={{ href: `/${role}/appointments`, label: "Appointments" }} title="Take session" /><ErrorState message={`This session was ${a.status === "cancelled" ? "cancelled" : "marked as a no-show"} and cannot be started.`} /></>;
  if (a.status === "completed") return <><PageHeader back={{ href: `/${role}/sessions/${a.id}`, label: "Session details" }} title="Session completed" /><ErrorState message="This session has already been completed. Open its details to see notes and transcript." /></>;
  return <SessionRoom session={a} role={role} exitHref={exit} />;
}