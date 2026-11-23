import { notFound, redirect } from "next/navigation";

import { LegalStepFrame } from "@/components/legal/legal-step-frame";
import { TitleContractNeedsForm } from "@/components/legal/title-contracts/title-contract-needs";
import { ToneCallout } from "@/components/ui/tone-callout";
import { can } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import { legalJourneyContext } from "@/lib/legal/journey-context";
import { scopeEntry } from "@/lib/legal/title-groups";
import { legalTitleLayout } from "@/lib/legal/title-layout";
import {
  loadAwaitingAgreements,
  loadTitleContractNeeds,
} from "@/lib/legal/title-contracts";
import {
  awaitingNames,
  awaitingOnTitle,
} from "@/lib/legal/title-contracts-rules";
import { legalTitleContractsKey } from "@/lib/ui/legal-steps";

const fr = { legalContracts };

/**
 * « Contrats du titre » (§ 3.4 of Ibé's 18/11/2026): the first step of a
 * collective's live title, where the Juridique confirms which contracts it
 * needs (production, image rights, publishing, beatmaker), ticked, then
 * recorded. « En attente de l'accord » says which guests of the title are
 * not yet agreed (§ 3.5): their contract is not drafted before. An address
 * of no title of the project answers 404; a title that has no such step
 * (abandoned) opens its group, else the Juridique's entry.
 */
export async function TitleContractsStep({
  projectId,
  titleId,
}: {
  projectId: string;
  titleId: string;
}) {
  const [ctx, layout] = await Promise.all([
    legalJourneyContext(projectId),
    legalTitleLayout(projectId),
  ]);
  if (!layout || !layout.titleIds.includes(titleId)) notFound();
  const key = legalTitleContractsKey(titleId);
  const scope = layout.scopes.find((s) => s.titleId === titleId);
  if (!scope?.steps.some((s) => s.key === key)) {
    const first = scope && scopeEntry(scope);
    redirect(first?.href ?? routes.projectLegal(projectId));
  }
  const [needs, awaiting] = await Promise.all([
    loadTitleContractNeeds(projectId),
    loadAwaitingAgreements(projectId),
  ]);
  const waiting = awaitingOnTitle(awaiting.guests, titleId);
  return (
    <LegalStepFrame projectId={projectId} stepKey={key} titre={titleId}>
      {waiting.length > 0 && (
        <ToneCallout tone="info">
          {fr.legalContracts.agreements.awaitingOf(awaitingNames(waiting))}
        </ToneCallout>
      )}
      <TitleContractNeedsForm
        projectId={projectId}
        titleId={titleId}
        needs={needs.get(titleId) ?? { confirmed: false, kinds: [] }}
        canConfirm={can(ctx.access, "manage_legal")}
      />
    </LegalStepFrame>
  );
}
