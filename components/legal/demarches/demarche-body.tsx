import { DemarchePart } from "@/components/legal/demarches/demarche-part";
import { DelegateButton } from "@/components/legal/tracking/delegate-button";
import { PlanSheetProvider } from "@/components/legal/tracking/plan-sheet-context";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ContractProof } from "@/lib/contracts/proof";
import { fr } from "@/lib/i18n/fr";
import type { Clearances } from "@/lib/legal/clearance/types";
import type { ContractCardData } from "@/lib/legal/contracts/document-card";
import type { Demarche } from "@/lib/legal/demarches/build";
import type { BoardRow } from "@/lib/legal/plan/board";

/**
 * The body of a démarche's step (proto « Projet complet », Juridique): its
 * current step in place — a person's fiche then contract, the other one
 * folded with its state — then who answers for it and by when, changeable
 * (a delegation kept in the plan's journal).
 */
export function DemarcheBody({
  projectId,
  projectTitle,
  demarche,
  clearances,
  proof,
  cards,
  owner,
  people,
}: {
  projectId: string;
  projectTitle: string;
  demarche: Demarche;
  clearances: Clearances;
  proof: Record<string, ContractProof>;
  cards: Record<string, ContractCardData>;
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
      owner={owner}
    />
  );
  const head = (row: BoardRow, index: number) => (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-[length:var(--type-body-sm)] font-semibold">
        {index + 1}. {fr.legal.board.steps[row.panel.kind]}
      </span>
      <StatusBadge tone={row.badge.tone} size="sm">
        {row.badge.label}
      </StatusBadge>
    </span>
  );
  return (
    <PlanSheetProvider projectId={projectId} initialOpen={null} actionable={[]}>
      {parts.length === 1 ? (
        <div className="flex flex-col gap-4">{part(parts[0])}</div>
      ) : (
        <ol
          aria-label={fr.legalDemarches.partsLabel}
          className="flex flex-col gap-4"
        >
          {parts.map((row, index) => (
            <li key={row.id} className="flex flex-col gap-3">
              {row.id === current?.id ? (
                <>
                  {head(row, index)}
                  {part(row)}
                </>
              ) : (
                <details className="group rounded-xl border border-[color:var(--border-hairline)] px-3.5 py-2.5">
                  <summary className="cursor-pointer list-none marker:hidden">
                    {head(row, index)}
                  </summary>
                  <div className="flex flex-col gap-4 pt-3">{part(row)}</div>
                </details>
              )}
            </li>
          ))}
        </ol>
      )}
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
