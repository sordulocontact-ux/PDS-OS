import { BriefFieldCard } from "@/components/framing/brief-field-card";
import { BudgetSection } from "@/components/strategy/budget-section";
import { CalendarBoard } from "@/components/strategy/calendar-board";
import { DeliverablesSection } from "@/components/strategy/deliverables-section";
import { KpisSection } from "@/components/strategy/kpis-section";
import { LeverPresets } from "@/components/strategy/lever-presets";
import { LeversSection } from "@/components/strategy/levers-section";
import { StrategyChoices } from "@/components/strategy/strategy-choices";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import type { StrategyTextField } from "@/lib/framing/brief";
import {
  NARRATIVE_PARTS,
  type DimensionAssessment,
} from "@/lib/strategy/assess";
import { STRATEGY_DIMENSIONS } from "@/lib/strategy/dimensions";
import type { StrategyData } from "@/lib/strategy/queries";
import type { UpstreamChain } from "@/lib/strategy/upstream";
import { strategyDimensionTone } from "@/lib/ui/state-tones";

/**
 * The work panel of one dimension (ticket § 2 to § 7): its question, what
 * is already known, the editor. Reuses the Strategy's blocks (choices,
 * levers, deliverables) and adds the narrative parts, the budget, the KPIs
 * and the calendar by channel.
 */
export function DimensionPanel({
  assessment,
  data,
  chains,
  projectId,
}: {
  assessment: DimensionAssessment;
  data: StrategyData;
  chains: UpstreamChain[];
  projectId: string;
}) {
  const t = fr.strategyFlow;
  const d = assessment.dimension;
  const index = STRATEGY_DIMENSIONS.indexOf(d);

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

  const body = (() => {
    switch (d) {
      case "positioning":
      case "audiences":
        return choices(d);
      case "narrative":
        return (
          <>
            {choices("narrative")}
            <div className="grid gap-3">
              {NARRATIVE_PARTS.map((key) => (
                <BriefFieldCard
                  key={`${key}-${data.extras[key].value ?? ""}-${data.extras[key].status ?? ""}`}
                  field={data.extras[key]}
                  label={t.narrative.parts[key]}
                  projectId={projectId}
                />
              ))}
            </div>
            <p className="text-caption text-muted-foreground">
              {t.narrative.reuse}
            </p>
          </>
        );
      case "setup":
        return (
          <>
            <LeverPresets
              existing={data.levers.map((l) => l.label)}
              projectId={projectId}
            />
            <LeversSection
              levers={data.levers}
              openNeeds={data.openNeeds}
              projectId={projectId}
            />
            <p className="text-caption text-muted-foreground">
              {t.setup.detail}
            </p>
          </>
        );
      case "deliverables":
        return (
          <>
            <DeliverablesSection
              deliverables={data.deliverables}
              levers={data.levers}
              members={data.members}
              projectId={projectId}
            />
            <p className="text-caption text-muted-foreground">
              {t.deliverables.toDesign}
            </p>
          </>
        );
      case "calendar":
        return (
          <CalendarBoard
            milestones={data.milestones}
            deliverables={data.deliverables}
            referenceDate={data.referenceDate}
            chains={chains}
            projectId={projectId}
          />
        );
      case "budget":
        return (
          <BudgetSection
            lines={data.budgetLines}
            levers={data.levers}
            none={data.budgetNone}
            envelopeCents={data.envelopeCents}
            projectId={projectId}
          />
        );
      case "objectives":
        return (
          <>
            <BriefFieldCard
              key={`objective-${data.extras.strategy_objective.value ?? ""}-${data.extras.strategy_objective.status ?? ""}`}
              field={data.extras.strategy_objective}
              label={t.objectives.objectiveTitle}
              projectId={projectId}
            />
            <KpisSection kpis={data.kpis} projectId={projectId} />
          </>
        );
    }
  })();

  return (
    <section
      aria-labelledby="dimension-title"
      className="flex min-w-0 flex-col gap-8"
    >
      <header className="flex flex-col gap-2">
        <p className="text-caption text-muted-foreground tabular-nums">
          {t.dimensionNumber(index)}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="dimension-title" className="text-display-sm font-semibold">
            {t.dimensions[d]}
          </h2>
          <StatusBadge tone={strategyDimensionTone[assessment.state]} size="sm">
            {t.states[assessment.state]}
          </StatusBadge>
        </div>
        <p className="max-w-prose text-body-md text-muted-foreground">
          {t.dimensionHints[d]}
        </p>
      </header>
      {assessment.toDecide.length > 0 && (
        <ToneCallout tone="warning">
          {t.states.to_decide} : {assessment.toDecide.join(", ")}
        </ToneCallout>
      )}
      {body}
    </section>
  );
}
