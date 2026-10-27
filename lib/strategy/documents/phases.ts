// Campaign phases of the Plan de sortie (ticket Stratégie § 11, step 2),
// proposed by code from the launch calendar: what happens before the release
// (teasing), on the release (sortie: J-1 to J+1), then after it
// (amplification). Only the phases the calendar fills are proposed; their
// number, names and bounds stay the owner's. Client-safe.

import { strategy } from "@/lib/i18n/fr/strategy";
import { strategyReleasePlan } from "@/lib/i18n/fr/strategy-release-plan";
import { dayOffset } from "@/lib/strategy/calendar";
import type { Phase } from "@/lib/strategy/documents/release-plan-model";

const fr = { strategy, strategyReleasePlan };

type Dated = { occurs_on: string };

// The release window: the day before, the day, the day after.
const WINDOW = 1;

/** Days from the release of each milestone, when the release date is known. */
export function offsetsOf(milestones: Dated[], releaseDate: string | null) {
  return releaseDate
    ? milestones.map((m) => dayOffset(m.occurs_on, releaseDate))
    : [];
}

export function proposePhases(
  milestones: Dated[],
  releaseDate: string | null,
): Phase[] {
  const t = fr.strategyReleasePlan.phases.defaults;
  const offsets = offsetsOf(milestones, releaseDate);
  if (offsets.length === 0) return [];
  const before = offsets.filter((d) => d < -WINDOW);
  const after = offsets.filter((d) => d > WINDOW);
  const phases: Phase[] = [];
  if (before.length)
    phases.push({
      id: "teasing",
      name: t.teasing,
      from: Math.min(...before),
      to: -WINDOW - 1,
    });
  phases.push({ id: "release", name: t.release, from: -WINDOW, to: WINDOW });
  if (after.length)
    phases.push({
      id: "amplification",
      name: t.amplification,
      from: WINDOW + 1,
      to: Math.max(...after),
    });
  return phases;
}

/** The milestones a phase covers (bounds included, open when null). */
export function inPhase(phase: Phase, offset: number): boolean {
  return (
    (phase.from === null || offset >= phase.from) &&
    (phase.to === null || offset <= phase.to)
  );
}

/** "J-10 → J-2", "Jour J", "À partir de J+2". */
export function phaseRange(phase: Phase): string {
  const t = fr.strategyReleasePlan.phases;
  const day = fr.strategy.calendar.dayOffset;
  if (phase.from !== null && phase.to !== null)
    return phase.from === phase.to
      ? day(phase.from)
      : t.range(day(phase.from), day(phase.to));
  if (phase.from !== null) return t.fromOnly(day(phase.from));
  if (phase.to !== null) return t.toOnly(day(phase.to));
  return t.open;
}
