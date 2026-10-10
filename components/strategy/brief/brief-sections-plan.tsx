import {
  BriefBlock,
  BriefEmpty,
} from "@/components/strategy/brief/brief-block";
import { formatEuros } from "@/lib/budget/types";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import type { StrategyBudget } from "@/lib/strategy/budget";
import { dayOffset } from "@/lib/strategy/calendar";
import { deliverableTitle } from "@/lib/strategy/deliverable-title";
import type { StrategyDimension } from "@/lib/strategy/dimensions";
import type { StrategyData } from "@/lib/strategy/queries";

const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

/**
 * Dimensions 05 to 08 of the Brief de sortie: deliverables, calendar,
 * budget (internal: never in the Plan de sortie nor the Dossier de presse)
 * and objectives. Every figure and date comes from the data, written by code.
 */
export function BriefSectionsPlan({
  data,
  budget,
  flagged,
}: {
  data: StrategyData;
  budget: StrategyBudget;
  flagged: Set<StrategyDimension>;
}) {
  const t = fr.strategyBrief.sections;
  const people = new Map(data.members.map((m) => [m.personId, m.name]));
  const levers = new Map(data.levers.map((l) => [l.id, l.label]));
  const channels = fr.strategyCalendar.channels;
  const days = fr.strategy.calendar.dayOffset;

  return (
    <>
      <BriefBlock
        dimension="deliverables"
        index={4}
        toDecide={flagged.has("deliverables")}
      >
        {data.deliverables.length === 0 ? (
          <BriefEmpty>{t.deliverablesNone}</BriefEmpty>
        ) : (
          <ul className="flex flex-col gap-1">
            {data.deliverables.map((d) => (
              <li key={d.id}>
                <span className="font-semibold">
                  {deliverableTitle(d.title, d.quantity)}
                </span>
                <span className="text-muted-foreground">
                  {" · "}
                  {[
                    levers.get(d.lever_id),
                    d.assignee_person_id
                      ? people.get(d.assignee_person_id)
                      : null,
                    d.due_date ? formatBriefDate(d.due_date) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </BriefBlock>

      <BriefBlock
        dimension="calendar"
        index={5}
        toDecide={flagged.has("calendar")}
      >
        {data.milestones.length === 0 ? (
          <BriefEmpty>{t.milestonesNone}</BriefEmpty>
        ) : (
          <ul className="flex flex-col gap-1">
            {data.milestones.map((m) => (
              <li key={m.id} className="tabular-nums">
                {data.referenceDate && (
                  <span className="font-semibold">
                    {days(dayOffset(m.occurs_on, data.referenceDate))}{" "}
                  </span>
                )}
                {m.title}
                <span className="text-muted-foreground">
                  {" · "}
                  {formatBriefDate(m.occurs_on)} ·{" "}
                  {channels[m.channel as keyof typeof channels] ?? m.channel}
                </span>
              </li>
            ))}
          </ul>
        )}
      </BriefBlock>

      <BriefBlock dimension="budget" index={6} toDecide={flagged.has("budget")}>
        <p className="tabular-nums">
          {t.budgetTotals(
            formatEuros(budget.proposedCents),
            formatEuros(budget.validatedCents),
            formatEuros(budget.toDecideCents),
          )}
        </p>
        <p className="text-muted-foreground tabular-nums">
          {budget.envelopeCents === null || budget.remainingCents === null
            ? t.noEnvelope
            : t.envelope(
                formatEuros(budget.envelopeCents),
                formatEuros(budget.remainingCents),
              )}
        </p>
        {budget.byLever.length > 0 && (
          <ul className="flex flex-col gap-1 tabular-nums">
            {budget.byLever.map((l) => (
              <li key={l.leverId ?? "none"}>
                <span className="font-semibold">{l.label}</span>
                <span className="text-muted-foreground">
                  {" · "}
                  {t.budgetTotals(
                    formatEuros(l.proposedCents),
                    formatEuros(l.validatedCents),
                    formatEuros(l.toDecideCents),
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </BriefBlock>

      <BriefBlock
        dimension="objectives"
        index={7}
        toDecide={flagged.has("objectives")}
      >
        <p>
          <span className="text-muted-foreground">{t.objective} : </span>
          {data.strategicObjective.value ?? t.empty}
        </p>
        {data.objectives.length === 0 ? (
          <BriefEmpty>{t.kpisNone}</BriefEmpty>
        ) : (
          <ul className="flex flex-col gap-1">
            {data.objectives.map((o) => (
              <li key={o.id}>
                <span className="font-semibold">{o.label}</span>
                <span className="text-muted-foreground tabular-nums">
                  {" · "}
                  {o.kind === "qualitative"
                    ? t.qualitative
                    : o.target === null
                      ? t.noTarget
                      : t.target(
                          [number.format(o.target), o.unit]
                            .filter(Boolean)
                            .join(" "),
                        )}
                  {o.due_on ? ` · ${formatBriefDate(o.due_on)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </BriefBlock>
    </>
  );
}
