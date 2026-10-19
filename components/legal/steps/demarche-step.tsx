import { notFound, redirect } from "next/navigation";

import { DemarcheBody } from "@/components/legal/demarches/demarche-body";
import { ProposedDemarche } from "@/components/legal/demarches/proposed-demarche";
import { LegalStepFrame } from "@/components/legal/legal-step-frame";
import { StepHistory } from "@/components/shell/journey/step-history";
import { contractProofOf } from "@/lib/contracts/proof";
import { generateReadyAgreements } from "@/lib/legal/contracts/auto-generate";
import { demarcheHistory } from "@/lib/legal/demarches/history";
import { loadLegalHistory } from "@/lib/legal/history/queries";
import { legalJourneyContext } from "@/lib/legal/journey-context";
import { legalRefSlug, type LegalDemarcheKind } from "@/lib/ui/legal-steps";

/**
 * One démarche of the plan as a step of the Juridique (proto « Projet
 * complet »): its current step done in place, who answers for it, then
 * « Déjà fait ». A person's agreement that became ready is generated on the
 * way (as the Suivi did), then the page is read again.
 */
export async function DemarcheStep({
  projectId,
  kind,
  slug,
}: {
  projectId: string;
  kind: LegalDemarcheKind;
  slug: string;
}) {
  const ctx = await legalJourneyContext(projectId);
  const demarche = ctx.demarches.find(
    (d) => d.kind === kind && legalRefSlug(d.ref) === slug,
  );
  if (!demarche) notFound();
  if (demarche.proposed)
    return (
      <LegalStepFrame projectId={projectId} stepKey={demarche.step.key}>
        <ProposedDemarche demarche={demarche} />
      </LegalStepFrame>
    );

  if (
    kind === "person" &&
    (await generateReadyAgreements(ctx.agreements, ctx.access)) > 0
  )
    redirect(demarche.step.href);

  const contractIds = demarche.parts.flatMap((p) =>
    p.panel.kind === "contract" && p.panel.row.contract
      ? [p.panel.row.contract.id]
      : [],
  );
  const [proof, history] = await Promise.all([
    contractProofOf(contractIds),
    loadLegalHistory(ctx.project, ctx.access),
  ]);
  return (
    <LegalStepFrame
      projectId={projectId}
      stepKey={demarche.step.key}
      history={
        <StepHistory items={demarcheHistory(demarche, history.events)} />
      }
    >
      <DemarcheBody
        projectId={projectId}
        demarche={demarche}
        clearances={ctx.clearances}
        proof={Object.fromEntries(proof)}
        people={ctx.tracking.state === "tracking" ? ctx.tracking.people : []}
      />
    </LegalStepFrame>
  );
}
