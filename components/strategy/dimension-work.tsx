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
import type { BudgetData } from "@/lib/budget/queries";
import type {
  FieldState,
  NarrativePart,
  PositioningPart,
} from "@/lib/framing/brief";
import { strategyBudget } from "@/lib/i18n/fr/strategy-budget";
import { strategyPilot } from "@/lib/i18n/fr/strategy-pilot";
import { strategyBudget as computeStrategyBudget } from "@/lib/strategy/budget";
import type { StrategyDimension } from "@/lib/strategy/dimensions";
import type { StrategyData } from "@/lib/strategy/queries";

const fr = { strategyBudget, strategyPilot };

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
  // while it is not confirmed (MKT-S1-06).
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
          part.status !== "confirmed" ? (
            <RedraftButton projectId={projectId} field={part.key} />
          ) : undefined
        }
      />
    </div>
  );

  switch (dimension) {
    case "positioning":
      return (
        <div className="flex flex-col gap-3">
          {data.positioningParts.map((part) =>
            partCard(part, fr.strategyPilot.positioning.parts[part.key]),
          )}
        </div>
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
      return (
        <>
          <NarrativeSummary
            field={data.narrativeSummary}
            parts={data.narrativeParts}
            projectId={projectId}
          />
          <div className="flex flex-col gap-3">
            {data.narrativeParts.map((part) =>
              partCard(part, fr.strategyPilot.narrative.parts[part.key]),
            )}
          </div>
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
          <div className="flex flex-col gap-3">
            <h3 className="text-body-md font-semibold">
              {fr.strategyBudget.linesTitle}
            </h3>
            <BudgetLines
              projectId={projectId}
              lines={budget.lines}
              levers={budget.levers}
              deliverables={budget.deliverables}
              organizationId={organizationId}
            />
          </div>
        </>
      );
    }
    case "objectives":
      return <ObjectivesWork data={data} projectId={projectId} />;
  }
}
