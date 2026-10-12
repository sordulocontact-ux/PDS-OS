import { BudgetLines } from "@/components/budget/budget-lines";
import { BriefFieldCard } from "@/components/framing/brief-field-card";
import { AudiencesSection } from "@/components/strategy/audiences-section";
import { LeverBudgetTable } from "@/components/strategy/budget/lever-budget-table";
import { StrategyBudgetSummary } from "@/components/strategy/budget/strategy-budget-summary";
import { CalendarSection } from "@/components/strategy/calendar-section";
import { DeliverablesSection } from "@/components/strategy/deliverables-section";
import { LeversSection } from "@/components/strategy/levers-section";
import { NarrativeSummary } from "@/components/strategy/narrative-summary";
import { ObjectivesWork } from "@/components/strategy/objectives-work";
import { RedraftButton } from "@/components/strategy/redraft-button";
import { StrategyChoices } from "@/components/strategy/strategy-choices";
import type { BudgetData } from "@/lib/budget/queries";
import type {
  FieldState,
  NarrativePart,
  PositioningPart,
  StrategyTextField,
} from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";
import { strategyBudget as computeStrategyBudget } from "@/lib/strategy/budget";
import type { StrategyDimension } from "@/lib/strategy/dimensions";
import type { StrategyData } from "@/lib/strategy/queries";

/**
 * The work of one dimension, unfolded on the pilotage: the blocks the Stratégie already
 * had (closed questions, levers, deliverables, calendar), the narrative's
 * story parts, the project's budget lines and the objectives.
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
  // Remounts when the saved answers change on the server.
  const choices = (key: StrategyTextField) => {
    const field = data.fields.find((f) => f.key === key)!;
    return (
      // The card's « premier manque » may point here (MKT-S1-05).
      <div id={`answer-${key}`} className="scroll-mt-24">
        <StrategyChoices
          key={`${key}-${JSON.stringify(data.choices[key])}-${field.value ?? ""}-${field.status ?? ""}`}
          field={field}
          value={data.choices[key]}
          suggestions={data.suggestions[key]}
          projectId={projectId}
        />
      </div>
    );
  };

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
        <>
          {choices("positioning")}
          <div className="flex flex-col gap-3">
            <h3 className="text-body-md font-semibold">
              {fr.strategyPilot.positioning.title}
            </h3>
            {data.positioningParts.map((part) =>
              partCard(part, fr.strategyPilot.positioning.parts[part.key]),
            )}
          </div>
        </>
      );
    case "audiences": {
      const described = new Set(
        data.audiences.map((a) => a.segment.trim().toLowerCase()),
      );
      const labels = fr.strategy.choices.options.audiences as Record<
        string,
        string
      >;
      return (
        <>
          {choices("audiences")}
          <AudiencesSection
            projectId={projectId}
            audiences={data.audiences}
            suggested={data.choices.audiences.choices
              .map((c) => labels[c])
              .filter(
                (label): label is string =>
                  !!label && !described.has(label.toLowerCase()),
              )}
          />
        </>
      );
    }
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
          {choices("narrative")}
        </>
      );
    case "levers":
      return (
        <LeversSection
          levers={data.levers}
          openNeeds={data.openNeeds}
          legalNeeds={data.legalNeeds}
          legalDependencies={data.legalDependencies}
          projectId={projectId}
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
          <StrategyBudgetSummary budget={strategyBudget} />
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
