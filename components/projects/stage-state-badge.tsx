import { IconCheck } from "nucleo-sharp-essential";

import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import type { StageState } from "@/lib/projects/types";
import { stageTreatment } from "@/lib/ui/state-treatments";

// State of a stage, always spelled out: contrast is never the only signal.
export function StageStateBadge({ state }: { state: StageState }) {
  return (
    <StatusBadge treatment={stageTreatment[state]}>
      {state === "validated" && <IconCheck aria-hidden className="size-3.5" />}
      {fr.shell.stageStates[state]}
    </StatusBadge>
  );
}
