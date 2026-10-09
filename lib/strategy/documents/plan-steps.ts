// What a generator's screens start from, computed by code: what the
// validated Brief already says (never asked again), each step's state, and
// the pages the data leaves empty. Client-safe.

import { fr } from "@/lib/i18n/fr";
import type { StrategySnapshot } from "@/lib/strategy/brief-snapshot";
import type { StrategyDimension } from "@/lib/strategy/dimensions";
import type {
  Format,
  PageKey,
  PressKitConfig,
  ReleasePlanConfig,
} from "@/lib/strategy/documents/model";

const KNOWN: Array<Exclude<StrategyDimension, "budget">> = [
  "positioning",
  "audiences",
  "narrative",
  "objectives",
  "setup",
  "deliverables",
  "calendar",
];

/** One line per dimension of the validated Brief (never the budget). */
export function knownLines(brief: StrategySnapshot) {
  const t = fr.strategyDocs.plan.knownItems;
  const notProvided = fr.framingIntel.notProvided;
  return KNOWN.map((dimension) => {
    const items =
      brief.sections.find((s) => s.dimension === dimension)?.items ?? [];
    const value =
      items.find((i) => i.value)?.value ??
      items
        .flatMap((i) => i.lines)
        .slice(0, 3)
        .join(" · ");
    return { key: dimension, label: t[dimension], value: value || notProvided };
  });
}

/** The validated deliverables as formats, when none were chosen yet. */
export function formatsFrom(
  deliverables: Array<{ id: string; title: string; quantity: number | null }>,
): Format[] {
  return deliverables.map((d) => ({
    id: `d-${d.id.slice(0, 8)}`,
    deliverableId: d.id,
    title: d.quantity ? `${d.quantity} × ${d.title}` : d.title,
    note: "",
    include: true,
  }));
}

export function releasePlanProgress(
  config: ReleasePlanConfig,
  hasVersion: boolean,
) {
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

export function pressKitProgress(config: PressKitConfig, hasVersion: boolean) {
  return [
    Boolean(config.contentConfirmed),
    Boolean(config.visualsConfirmed),
    Boolean(config.pagesConfirmed),
    hasVersion,
  ];
}

/** Pages of the Plan de sortie with nothing to show from today's data. */
export function emptyPlanPages(
  brief: StrategySnapshot,
  config: ReleasePlanConfig,
  milestoneCount: number,
): PageKey[] {
  const has = (d: StrategyDimension) =>
    brief.sections
      .find((s) => s.dimension === d)
      ?.items.some((i) => i.value || i.lines.length) ?? false;
  const empty: PageKey[] = ["free"];
  if (!has("positioning") && !has("audiences")) empty.push("positioning");
  if (!has("narrative")) empty.push("narrative");
  if (!config.phases?.length) empty.push("phases");
  if (!has("setup")) empty.push("setup");
  if (!config.formats?.some((f) => f.include)) empty.push("contents");
  if (!config.visuals?.length && !config.direction?.palette?.length)
    empty.push("moodboard");
  if (milestoneCount === 0) empty.push("timeline");
  return empty;
}
