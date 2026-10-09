// Campaign phases of the Plan de sortie (ticket § 11, step 2), proposed by
// code from the launch calendar: what happens before the release (teasing),
// on the day, then after it (amplification). Only the phases the calendar
// fills are proposed; their number and names stay the owner's. Client-safe.

import { fr } from "@/lib/i18n/fr";
import { dayOffset } from "@/lib/strategy/calendar";
import type { Phase } from "@/lib/strategy/documents/model";

type Dated = { occurs_on: string };

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
  const t = fr.strategyDocs.plan.phaseDefaults;
  const offsets = offsetsOf(milestones, releaseDate);
  if (offsets.length === 0) return [];
  const before = offsets.filter((d) => d < 0);
  const after = offsets.filter((d) => d > 0);
  const phases: Phase[] = [];
  if (before.length)
    phases.push({
      id: "teasing",
      name: t.teasing,
      from: Math.min(...before),
      to: -1,
    });
  phases.push({ id: "release", name: t.release, from: 0, to: 0 });
  if (after.length)
    phases.push({
      id: "amplification",
      name: t.amplification,
      from: 1,
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

/** "J-10 → J-1", "Jour J", "à partir de J+2". */
export function phaseRange(phase: Phase): string {
  const t = fr.strategyDocs.plan;
  const day = fr.strategy.calendar.dayOffset;
  if (phase.from !== null && phase.to !== null)
    return phase.from === phase.to
      ? day(phase.from)
      : t.phaseRange(day(phase.from), day(phase.to));
  if (phase.from !== null) return t.phaseFromOnly(day(phase.from));
  if (phase.to !== null) return t.phaseToOnly(day(phase.to));
  return t.phaseOpen;
}
