import { LegalInventory } from "@/components/legal/legal-inventory";
import { LegalStepFrame } from "@/components/legal/legal-step-frame";
import { asFactStatus } from "@/lib/facts/views";
import { legalJourneyContext } from "@/lib/legal/journey-context";

/** État des lieux: what the project knows, read only (`?state=` filters). */
export async function InventoryStep({
  projectId,
  state,
}: {
  projectId: string;
  state: unknown;
}) {
  const { inventory } = await legalJourneyContext(projectId);
  return (
    <LegalStepFrame projectId={projectId} stepKey="inventory">
      <LegalInventory inventory={inventory} state={asFactStatus(state)} />
    </LegalStepFrame>
  );
}
