import { StatusBadge } from "@/components/ui/status-badge";
import type { CallStatus } from "@/lib/calls/constants";
import { callStateKey } from "@/lib/calls/format";
import { calls } from "@/lib/i18n/fr/calls";
import { callStatusTone } from "@/lib/ui/state-tones";

const fr = { calls };

type StateOptions = {
  // A draft planned in the future reads « À venir », not « À enregistrer ».
  upcoming?: boolean;
  // Its report was closed (call_closures): « Clôturé ».
  closed?: boolean;
};

/** A call's state as a label and its tone: the badge, or a module header's
 * `status` (a project's call page). */
export function callState(status: CallStatus, options: StateOptions) {
  const key = callStateKey(status, options);
  return { label: fr.calls.status[key], tone: callStatusTone[key] };
}

/** The label always carries the meaning; contrast only reinforces it (docs/DESIGN.md § 1). */
export function CallStatusBadge({
  status,
  upcoming = false,
  closed = false,
}: { status: CallStatus } & StateOptions) {
  const state = callState(status, { upcoming, closed });
  return <StatusBadge tone={state.tone}>{state.label}</StatusBadge>;
}
