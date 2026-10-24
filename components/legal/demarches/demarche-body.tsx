import { DemarchePart } from "@/components/legal/demarches/demarche-part";
import { DelegateButton } from "@/components/legal/tracking/delegate-button";
import { PlanSheetProvider } from "@/components/legal/tracking/plan-sheet-context";
import { StepSection } from "@/components/shell/journey/step-section";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ContractProof } from "@/lib/contracts/proof";
import { fr } from "@/lib/i18n/fr";
import type { Clearances } from "@/lib/legal/clearance/types";
import type { ContractCardData } from "@/lib/legal/contracts/document-card";
import type { ContractInvoices } from "@/components/invoices/contract-invoice";
import type { Demarche } from "@/lib/legal/demarches/build";
import type { BoardRow } from "@/lib/legal/plan/board";

/**
 * The body of a démarche's step (proto Juridique v3): its current part in
 * place — a person's fiche, then once validated their contract, one title
 * at a time — then who answers for it and by when, changeable (a
 * delegation kept in the plan's journal).
 */
export function DemarcheBody({
  projectId,
  projectTitle,
  demarche,
  clearances,
  proof,
  cards,
  invoices,
  linkedContacts,
  direction,
  owner,
  people,
}: {
  projectId: string;
  projectTitle: string;
  demarche: Demarche;
  clearances: Clearances;
  proof: Record<string, ContractProof>;
  cards: Record<string, ContractCardData>;
  invoices: ContractInvoices;
  // The people with an active private link on this project (/c/).
  linkedContacts: string[];
  direction: string;
  // Who answers for it (« Revient signé en tête de l'étape de … »).
  owner: string;
  // Who may answer for it (delegation).
  people: Array<{ personId: string; name: string }>;
}) {
  const { parts, current, own } = demarche;
  const part = (row: BoardRow) => (
    <DemarchePart
      projectId={projectId}
      projectTitle={projectTitle}
      row={row}
      clearances={clearances}
      proof={proof}
      cards={cards}
      invoices={invoices}
      linkedContacts={linkedContacts}
      direction={direction}
      owner={owner}
    />
  );
  // One title at a time (proto Juridique v3): the fiche while it is the
  // object at work, then « Contrat · <modèle> »; what was done before is in
  // « Déjà fait ». A done démarche shows its last part.
  const shown = current ?? parts[parts.length - 1] ?? null;
  const titleOf = (row: BoardRow) =>
    row.panel.kind === "contract" && row.panel.row.template
      ? `${fr.legal.board.steps.contract} · ${row.panel.row.template.name}`
      : fr.legal.board.steps[row.panel.kind];
  return (
    <PlanSheetProvider projectId={projectId} initialOpen={null} actionable={[]}>
      {shown &&
        (parts.length === 1 ? (
          <div className="flex flex-col gap-4">{part(shown)}</div>
        ) : (
          <StepSection
            title={titleOf(shown)}
            aside={
              <StatusBadge tone={shown.badge.tone} size="sm">
                {shown.badge.label}
              </StatusBadge>
            }
          >
            {part(shown)}
          </StepSection>
        ))}
      {own && demarche.step.status !== "done" && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[color:var(--border-hairline)] pt-3.5 text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
          <span>
            {fr.legalDemarches.responsible} ·{" "}
            {own.responsibleName ?? fr.legal.plan.noResponsible}
          </span>
          <DelegateButton
            projectId={projectId}
            itemId={own.id}
            label={demarche.step.title}
            responsibleId={own.responsibleId}
            dueOn={own.dueOn}
            people={people}
          />
        </div>
      )}
    </PlanSheetProvider>
  );
}
