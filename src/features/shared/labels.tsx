import { StatusBadge } from "@/components/ui/card";
import type { Client } from "@/services/types";

export function JourneyBadges({ client }: { client: Pick<Client, "onboarding" | "registration"> }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      <StatusBadge status={client.onboarding} />
      <StatusBadge status={client.registration} />
    </span>
  );
}

export const sessionStatusOptions = ["scheduled", "link_shared", "joined", "live", "completed", "cancelled", "no_show"].map((v) => ({ value: v, label: v === "link_shared" ? "Link shared" : v === "no_show" ? "No-show" : v.charAt(0).toUpperCase() + v.slice(1) }));
export const modeOptions = [{ value: "video", label: "Video" }, { value: "audio", label: "Audio" }, { value: "in_person", label: "In person" }];
export const modeLabel: Record<string, string> = { video: "Video", audio: "Audio", in_person: "In person" };
