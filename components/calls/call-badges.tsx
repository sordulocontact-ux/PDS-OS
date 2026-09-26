import { StatusBadge } from "@/components/ui/status-badge";
import type { CallStatus, Consent } from "@/lib/calls/constants";
import { fr } from "@/lib/i18n/fr";
import {
  callStatusTreatment,
  consentTreatment,
} from "@/lib/ui/state-treatments";

/** The label always carries the meaning; contrast only reinforces it (docs/DESIGN.md § 1). */
export function ConsentBadge({ consent }: { consent: Consent }) {
  return (
    <StatusBadge treatment={consentTreatment[consent]}>
      {fr.calls.consent.label[consent]}
    </StatusBadge>
  );
}

export function CallStatusBadge({ status }: { status: CallStatus }) {
  return (
    <StatusBadge treatment={callStatusTreatment[status]}>
      {fr.calls.status[status]}
    </StatusBadge>
  );
}
