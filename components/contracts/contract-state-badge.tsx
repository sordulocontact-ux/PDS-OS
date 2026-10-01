import { StatusBadge } from "@/components/ui/status-badge";
import type { ContractState } from "@/lib/contracts/types";
import { fr } from "@/lib/i18n/fr";
import { contractStateTone } from "@/lib/ui/state-tones";

/** Where a contract stands, in its tone (lib/ui/state-tones.ts). */
export function ContractStateBadge({
  state,
  size = "sm",
}: {
  state: ContractState;
  size?: "sm" | "md";
}) {
  return (
    <StatusBadge tone={contractStateTone[state]} size={size}>
      {fr.contracts.states[state]}
    </StatusBadge>
  );
}
