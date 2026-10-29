import { StatusBadge } from "@/components/ui/status-badge";
import type { CallStatus } from "@/lib/calls/constants";
import { callStateKey } from "@/lib/calls/format";
import { calls } from "@/lib/i18n/fr/calls";
import { callStatusTone } from "@/lib/ui/state-tones";

const fr = { calls };

/** The label always carries the meaning; contrast only reinforces it (docs/DESIGN.md § 1). */
export function CallStatusBadge({
  status,
  upcoming = false,
  closed = false,
}: {
  status: CallStatus;
  // A draft planned in the future reads « À venir », not « À enregistrer ».
  upcoming?: boolean;
  // Its report was closed (call_closures): « Clôturé ».
  closed?: boolean;
}) {
  const key = callStateKey(status, { upcoming, closed });
  return (
    <StatusBadge tone={callStatusTone[key]}>{fr.calls.status[key]}</StatusBadge>
  );
}
