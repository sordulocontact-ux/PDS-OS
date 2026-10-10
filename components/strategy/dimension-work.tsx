import { BudgetLines } from "@/components/budget/budget-lines";
import { BriefFieldCard } from "@/components/framing/brief-field-card";
import { LeverBudgetTable } from "@/components/strategy/budget/lever-budget-table";
import { StrategyBudgetSummary } from "@/components/strategy/budget/strategy-budget-summary";
import { CalendarSection } from "@/components/strategy/calendar-section";
import { DeliverablesSection } from "@/components/strategy/deliverables-section";
import { LeversSection } from "@/components/strategy/levers-section";
import { ObjectivesWork } from "@/components/strategy/objectives-work";
import { StrategyChoices } from "@/components/strategy/strategy-choices";
import type { BudgetData } from "@/lib/budget/queries";
import type { StrategyTextField } from "@/lib/framing/brief";
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
}: {
  dimension: StrategyDimension;
  data: StrategyData;
  budget: BudgetData;
  envelopeCents: number | null;
  projectId: string;
}) {
  // Remounts when the saved answers change on the server.
  const choices = (key: StrategyTextField) => {
    const field = data.fields.find((f) => f.key === key)!;
    return (
      <StrategyChoices
        key={`${key}-${JSON.stringify(data.choices[key])}-${field.value ?? ""}-${field.status ?? ""}`}
        field={field}
        value={data.choices[key]}
        suggestions={data.suggestions[key]}
        projectId={projectId}
      />
    );
  };

  switch (dimension) {
    case "positioning":
    case "audiences":
      return choices(dimension);
    case "narrative":
      return (
        <>
          <div className="flex flex-col gap-3">
            {data.narrativeParts.map((part) => (
              <BriefFieldCard
                key={`${part.key}-${part.value ?? ""}-${part.status ?? ""}`}
                field={part}
                label={
                  fr.strategyPilot.narrative.parts[
                    part.key as keyof typeof fr.strategyPilot.narrative.parts
                  ]
                }
                projectId={projectId}
              />
            ))}
          </div>
          {choices("narrative")}
        </>
      );
    case "levers":
      return (
        <LeversSection
          levers={data.levers}
          openNeeds={data.openNeeds}
          projectId={projectId}
        />
      );
    case "deliverables":
      return (
        <DeliverablesSection
          deliverables={data.deliverables}
          levers={data.levers}
          members={data.members}
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
            />
          </div>
        </>
      );
    }
    case "objectives":
      return <ObjectivesWork data={data} projectId={projectId} />;
  }
}
