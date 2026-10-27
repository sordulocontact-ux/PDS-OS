import { StatusBadge } from "@/components/ui/status-badge";
import type { ContractState } from "@/lib/contracts/types";
import { contracts } from "@/lib/i18n/fr/contracts";
import { contractStateTone } from "@/lib/ui/state-tones";

const fr = { contracts };

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
