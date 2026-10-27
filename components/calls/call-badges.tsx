import { StatusBadge } from "@/components/ui/status-badge";
import type { CallStatus } from "@/lib/calls/constants";
import { calls } from "@/lib/i18n/fr/calls";
import { callStatusTone } from "@/lib/ui/state-tones";

const fr = { calls };

/** The label always carries the meaning; contrast only reinforces it (docs/DESIGN.md § 1). */
// `upcoming`: a draft planned in the future reads "À venir", not "Brouillon".
export function CallStatusBadge({
  status,
  upcoming = false,
}: {
  status: CallStatus;
  upcoming?: boolean;
}) {
  const key = upcoming ? "upcoming" : status;
  return (
    <StatusBadge tone={callStatusTone[key]}>{fr.calls.status[key]}</StatusBadge>
  );
}
