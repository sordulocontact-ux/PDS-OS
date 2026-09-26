import { StatusBadge } from "@/components/ui/status-badge";
import type { CallStatus, Consent } from "@/lib/calls/constants";
import { fr } from "@/lib/i18n/fr";
import { callStatusTone, consentTone } from "@/lib/ui/state-tones";

/** The label always carries the meaning; contrast only reinforces it (docs/DESIGN.md § 1). */
export function ConsentBadge({ consent }: { consent: Consent }) {
  return (
    <StatusBadge tone={consentTone[consent]}>
      {fr.calls.consent.label[consent]}
    </StatusBadge>
  );
}

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
