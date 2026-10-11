import { StatusBadge } from "@/components/ui/status-badge";
import type { ActivationStatus } from "@/lib/activations/model";
import type { MeasureState, ProofState } from "@/lib/activations/states";
import { fr } from "@/lib/i18n/fr";
import {
  activationStatusTone,
  measureTone,
  proofTone,
} from "@/lib/ui/state-tones";

const t = fr.activations;

/** The three axes of an activation, never merged into one label (ticket :
 * « Trois axes sont affichés séparément »). */
export function ActivationStatusBadge({
  status,
  size = "sm",
}: {
  status: ActivationStatus;
  size?: "sm" | "md";
}) {
  return (
    <StatusBadge size={size} tone={activationStatusTone[status]}>
      {t.statuses[status]}
    </StatusBadge>
  );
}

export function ProofBadge({
  state,
  size = "sm",
}: {
  state: ProofState;
  size?: "sm" | "md";
}) {
  return (
    <StatusBadge size={size} tone={proofTone[state]}>
      {t.proof.states[state]}
    </StatusBadge>
  );
}

export function MeasureBadge({
  state,
  size = "sm",
}: {
  state: MeasureState;
  size?: "sm" | "md";
}) {
  return (
    <StatusBadge size={size} tone={measureTone[state]}>
      {t.measure.states[state]}
    </StatusBadge>
  );
}
