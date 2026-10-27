// What the Plan de sortie generator's screens start from, computed by code:
// what the validated strategy already says (never asked again), and each
// step's state. Client-safe.

import { formatDay } from "@/lib/assistant/facts";
import { strategyReleasePlan } from "@/lib/i18n/fr/strategy-release-plan";
import type { ReleasePlanInput } from "@/lib/strategy/documents/release-plan-build";
import type {
  ReleasePlanConfig,
  ReleasePlanPage,
} from "@/lib/strategy/documents/release-plan-model";

const fr = { strategyReleasePlan };

const join = (values: string[]) => values.slice(0, 4).join(" · ") || null;

/** One line per thing the validated strategy decided (never the budget). */
export function knownItems(
  input: Omit<ReleasePlanInput, "images">,
  kpis: number,
) {
  const t = fr.strategyReleasePlan.intro;
  const release = input.project.releaseDate;
  return [
    { label: t.items.positioning, value: input.positioning },
    { label: t.items.audiences, value: input.audiences },
    {
      label: t.items.narrative,
      value: join(input.narrative.map((n) => n.text)),
    },
    {
      label: t.items.objectives,
      value:
        [input.objective, kpis ? `${kpis} KPI${kpis > 1 ? "s" : ""}` : null]
          .filter(Boolean)
          .join(" · ") || null,
    },
    { label: t.items.levers, value: join(input.levers.map((l) => l.label)) },
    {
      label: t.items.deliverables,
      value: join(input.formats.map((f) => f.title)),
    },
    {
      label: t.items.calendar,
      value: input.milestones.length
        ? [
            t.milestones(input.milestones.length),
            release ? formatDay(release) : null,
          ]
            .filter(Boolean)
            .join(" · ")
        : null,
    },
  ];
}

/** Each of the eight steps: done or to do. */
export function stepsDone(config: ReleasePlanConfig, hasVersion: boolean) {
  return [
    true,
    Boolean(config.phasesConfirmed),
    Boolean(config.formatsConfirmed),
    Boolean(config.visualsConfirmed),
    Boolean(config.direction?.accepted),
    Boolean(config.pagesConfirmed),
    hasVersion,
    hasVersion,
  ];
}

/** Which pages today's data and choices leave empty (not generated). */
export function emptyPages(
  input: Pick<
    ReleasePlanInput,
    | "positioning"
    | "audiences"
    | "objective"
    | "narrative"
    | "levers"
    | "milestones"
    | "formats"
  >,
  config: ReleasePlanConfig,
  images: number,
): ReleasePlanPage[] {
  const empty: ReleasePlanPage[] = ["free"];
  if (!input.positioning && !input.audiences && !input.objective)
    empty.push("positioning");
  if (input.narrative.length === 0) empty.push("narrative");
  if (!config.phases?.length) empty.push("phases");
  if (input.levers.length === 0) empty.push("setup");
  if (!(config.formats ?? input.formats).some((f) => f.include))
    empty.push("contents");
  if (!images && !config.direction?.palette.length) empty.push("moodboard");
  if (input.milestones.length === 0) empty.push("timeline");
  return empty;
}
