import { BudgetLines } from "@/components/budget/budget-lines";
import { BriefFieldCard } from "@/components/framing/brief-field-card";
import { AudiencesSection } from "@/components/strategy/audiences-section";
import { LeverBudgetTable } from "@/components/strategy/budget/lever-budget-table";
import { CalendarSection } from "@/components/strategy/calendar-section";
import { DeliverablesSection } from "@/components/strategy/deliverables-section";
import { LegalDependencies } from "@/components/strategy/legal-dependencies";
import { NarrativeSummary } from "@/components/strategy/narrative-summary";
import { ObjectivesWork } from "@/components/strategy/objectives-work";
import { RedraftButton } from "@/components/strategy/redraft-button";
import { StrategyPart } from "@/components/strategy/strategy-part";
import type { BudgetData } from "@/lib/budget/queries";
import type {
  FieldState,
  NarrativePart,
  PositioningPart,
} from "@/lib/framing/brief";
import { strategyBudget } from "@/lib/i18n/fr/strategy-budget";
import { strategyDimensions } from "@/lib/i18n/fr/strategy-dimensions";
import { strategyPilot } from "@/lib/i18n/fr/strategy-pilot";
import { strategyBudget as computeStrategyBudget } from "@/lib/strategy/budget";
import type { StrategyDimension } from "@/lib/strategy/dimensions";
import type { StrategyData } from "@/lib/strategy/queries";

const fr = { strategyBudget, strategyDimensions, strategyPilot };

/**
 * What a dimension keeps folded under its lines (« Garde, repliés »,
 * docs/ARCHITECTURE.md § 6 bis « Lot 3 »): what the ticket and Ibé's returns
 * asked beyond the proto — the four points of the positioning (MKT-S1-05),
 * each public described, the narrative in five parts and its synthesis
 * (ticket § 2, MKT-S1-06), the legal prerequisites (MKT-S1-07), quantity,
 * lever and lead times of the deliverables (MKT-S1-08), the calendar by
 * channel and its milestones to edit (ticket § 5), the budget by lever and
 * its lines (ticket § 6), the strategic objective and figured KPIs (ticket
 * § 7). The closed-choice grid is gone (code only, against the ticket's
 * « pas un formulaire rigide »).
 */
export function DimensionWork({
  dimension,
  data,
  budget,
  envelopeCents,
  projectId,
  organizationId,
}: {
  dimension: StrategyDimension;
  data: StrategyData;
  budget: BudgetData;
  envelopeCents: number | null;
  projectId: string;
  // Where a spend's proof is uploaded.
  organizationId: string | null;
}) {
  // A part of the positioning or the narrative: an anchor for the card's
  // « premier manque » and the draft's questions, and « Proposer à nouveau »
  // on PO's proposal (MKT-S1-06).
  const partCard = (
    part: FieldState<PositioningPart | NarrativePart>,
    label: string,
  ) => (
    <div
      key={`${part.key}-${part.value ?? ""}-${part.status ?? ""}`}
      id={`answer-${part.key}`}
      className="scroll-mt-24"
    >
      <BriefFieldCard
        field={part}
        label={label}
        projectId={projectId}
        actions={
          // « Proposer à nouveau » once PO proposed it: empty, PO's
          // question above asks it (« M'aider à définir »).
          part.status === "proposed" ? (
            <RedraftButton projectId={projectId} field={part.key} />
          ) : undefined
        }
      />
    </div>
  );

  switch (dimension) {
    case "positioning":
      return (
        <StrategyPart title={fr.strategyDimensions.parts.positioning}>
          {data.positioningParts.map((part) =>
            partCard(part, fr.strategyPilot.positioning.parts[part.key]),
          )}
        </StrategyPart>
      );
    case "audiences":
      return (
        <AudiencesSection
          projectId={projectId}
          audiences={data.audiences}
          suggested={[]}
        />
      );
    case "narrative":
      // The parts first, then the synthesis PO writes from them.
      return (
        <>
          <StrategyPart title={fr.strategyDimensions.parts.narrative}>
            {data.narrativeParts.map((part) =>
              partCard(part, fr.strategyPilot.narrative.parts[part.key]),
            )}
          </StrategyPart>
          <NarrativeSummary
            field={data.narrativeSummary}
            parts={data.narrativeParts}
            projectId={projectId}
          />
        </>
      );
    case "levers":
      return (
        <LegalDependencies
          dependencies={data.legalDependencies}
          needs={data.legalNeeds}
        />
      );
    case "deliverables":
      return (
        <DeliverablesSection
          deliverables={data.deliverables}
          levers={data.levers}
          members={data.members}
          milestones={data.milestones}
          projectId={projectId}
        />
      );
    case "calendar":
      return (
        <CalendarSection
          milestones={data.milestones}
          deliverables={data.deliverables}
          referenceDate={data.referenceDate}
          projectId={projectId}
        />
      );
    case "budget": {
      const strategyBudget = computeStrategyBudget(
        budget.lines,
        data.levers,
        envelopeCents,
        data.envelopeToConfirm,
      );
      return (
        <>
          <LeverBudgetTable rows={strategyBudget.byLever} />
          <StrategyPart title={fr.strategyBudget.linesTitle}>
            <BudgetLines
              target={{ kind: "project", id: projectId }}
              lines={budget.lines}
              levers={budget.levers}
              deliverables={budget.deliverables}
              organizationId={organizationId}
            />
          </StrategyPart>
        </>
      );
    }
    case "objectives":
      return <ObjectivesWork data={data} projectId={projectId} />;
  }
}
