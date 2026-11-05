import { notFound, redirect } from "next/navigation";

import { DemarcheBody } from "@/components/legal/demarches/demarche-body";
import { ProposedDemarche } from "@/components/legal/demarches/proposed-demarche";
import { LegalStepFrame } from "@/components/legal/legal-step-frame";
import { StepHistory } from "@/components/shell/journey/step-history";
import { contractProofOf } from "@/lib/contracts/proof";
import { generateReadyAgreements } from "@/lib/legal/contracts/auto-generate";
import { loadContractCards } from "@/lib/legal/contracts/document-card";
import { loadProjectInvoices } from "@/lib/invoices/queries";
import { loadInvoiceStates } from "@/lib/invoices/states";
import { demarcheHistory } from "@/lib/legal/demarches/history";
import { loadLegalHistory } from "@/lib/legal/history/queries";
import { loadContactLinks } from "@/lib/portal/contact-links";
import { legalDemarches } from "@/lib/i18n/fr/legal-demarches";
import { legalJourneyContext } from "@/lib/legal/journey-context";
import { legalRefSlug, type LegalDemarcheKind } from "@/lib/ui/legal-steps";

const fr = { legalDemarches };

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
  const [proof, history, cards, invoiceView, invoiceStates, links] =
    await Promise.all([
      contractProofOf(contractIds),
      loadLegalHistory(ctx.project, ctx.access),
      loadContractCards(contractIds),
      loadProjectInvoices(projectId, ctx.project.ownerPersonId),
      loadInvoiceStates(projectId),
      contractIds.length > 0 ? loadContactLinks(projectId) : null,
    ]);
  // A contract's invoice: read by the owner and the direction, where it
  // stands for the Juridique (one invoice system, 20/10/2026).
  const byContract = Object.fromEntries(
    contractIds.map((id) => [
      id,
      {
        invoice: invoiceView.invoices.find((i) => i.contractId === id) ?? null,
        state: invoiceStates.find((s) => s.contractId === id) ?? null,
      },
    ]),
  );
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
        projectTitle={ctx.project.title}
        demarche={demarche}
        clearances={ctx.clearances}
        proof={Object.fromEntries(proof)}
        cards={cards}
        invoices={{ byContract, view: invoiceView }}
        linkedContacts={(links?.rows ?? []).flatMap((r) =>
          r.link ? [r.contactId] : [],
        )}
        direction={ctx.direction ?? fr.legalDemarches.direction}
        owner={
          demarche.own?.responsibleName ??
          ctx.project.ownerName ??
          fr.legalDemarches.direction
        }
        people={ctx.tracking.state === "tracking" ? ctx.tracking.people : []}
        ownerChangedBy={
          // The plan journal's last change of who or when (« Modifié par »).
          history.events
            .filter(
              (e) =>
                demarche.own !== null &&
                e.object === `plan-item:${demarche.own.id}`,
            )
            .sort((a, b) => b.at.localeCompare(a.at))[0]?.by ?? null
        }
      />
    </LegalStepFrame>
  );
}
