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

/**
 * One thing the validated strategy already says, as the first screen of a
 * generator shows it (Sacha, 10/11/2026: no more long texts in a table):
 * a sentence (`value`), pills (`items`), or the narrative's angle with its
 * other parts folded under it (`parts`). `wide` takes a whole row.
 */
export type KnownFact = {
  key: string;
  label: string;
  value: string | null;
  items?: string[];
  parts?: Array<{ label: string; text: string }>;
  wide?: boolean;
};

/** What the validated strategy decided (never the budget). */
export function knownItems(
  input: Omit<ReleasePlanInput, "images">,
  kpis: number,
): KnownFact[] {
  const t = fr.strategyReleasePlan.intro;
  const release = input.project.releaseDate;
  const angleLabel = fr.strategyReleasePlan.content.angle;
  const angle =
    input.narrative.find((n) => n.label === angleLabel) ??
    input.narrative[0] ??
    null;
  const milestones = [...input.milestones].sort((a, b) =>
    a.occurs_on.localeCompare(b.occurs_on),
  );
  return [
    {
      key: "positioning",
      label: t.items.positioning,
      value: input.positioning,
    },
    {
      key: "objectives",
      label: t.items.objectives,
      value:
        [input.objective, kpis ? t.kpis(kpis) : null]
          .filter(Boolean)
          .join(" · ") || null,
    },
    {
      key: "narrative",
      label: t.items.narrative,
      value: angle?.text ?? null,
      parts: input.narrative.filter((n) => n !== angle),
      wide: true,
    },
    { key: "audiences", label: t.items.audiences, value: input.audiences },
    {
      key: "levers",
      label: t.items.levers,
      value: null,
      items: input.levers.map((l) => l.label),
    },
    {
      key: "deliverables",
      label: t.items.deliverables,
      value: null,
      items: input.formats.map((f) => f.title),
      wide: true,
    },
    {
      key: "calendar",
      label: t.items.calendar,
      value: release ? t.release(formatDay(release)) : null,
      items: milestones.map((m) =>
        t.milestone(m.title, formatDay(m.occurs_on)),
      ),
      wide: true,
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
