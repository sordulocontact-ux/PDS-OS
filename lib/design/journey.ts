// The Conception's journey (MKT-C2-03): six steps, the blockers and the one
// next action, all computed by code from the facts of the module (CLAUDE.md,
// rule 6). Client-safe, pure. A step is done only when its minimal output
// exists or was explicitly passed over (« Commencer sans échange » passes the
// creative exchange); the dossier's progress is not a deliverable's.

import { blockersOf, nextOf } from "@/lib/design/journey-next";
import type { DirectionState, SheetStatus } from "@/lib/design/states";
import { fr } from "@/lib/i18n/fr";

export const JOURNEY_STEPS = [
  "prepare",
  "exchange",
  "develop",
  "consolidate",
  "validate",
  "production",
] as const;
export type JourneyStepKey = (typeof JOURNEY_STEPS)[number];
export type JourneyStepState = "done" | "current" | "todo" | "skipped";

export type JourneyStep = {
  key: JourneyStepKey;
  state: JourneyStepState;
  summary: string;
};

export type JourneyLink = { label: string; href: string; place: string };

export type JourneyNext =
  | { kind: "action"; action: JourneyLink }
  // Nothing for this person: what the rest waits for, if anything.
  | { kind: "waiting"; what: string | null }
  | { kind: "read_only" };

export type JourneyInput = {
  projectId: string;
  started: boolean;
  // The owner, or whoever writes in the Conception (design_can_write).
  isOwner: boolean;
  canWrite: boolean;
  // design_calls prepared, call reports already used as sources.
  callsPlanned: number;
  callSources: number;
  proposals: number;
  unattachedReferences: number;
  toQualify: number;
  direction: {
    state: DirectionState;
    answered: number;
    proposals: number;
    hasResponsible: boolean;
    canSubmit: boolean;
  };
  // The committed deliverables, with their Fiche Livrable when created.
  deliverables: Array<{
    id: string;
    title: string;
    answered: number;
    proposals: number;
    sheet: { id: string; status: SheetStatus } | null;
  }>;
  brief: { latest: number | null; upToDate: boolean };
  // The Conception stage as stored (not_started … validated).
  stageState: string;
};

const VALIDATED: SheetStatus[] = ["ready_for_production", "transferred"];

export function journey(input: JourneyInput): {
  steps: JourneyStep[];
  next: JourneyNext;
  blockers: JourneyLink[];
} {
  const t = fr.conceptionJourney;
  const s = t.summaries;
  const sheets = input.deliverables.flatMap((d) =>
    d.sheet ? [{ ...d.sheet, title: d.title }] : [],
  );
  const total = input.deliverables.length;
  const validated = input.deliverables.filter(
    (d) => d.sheet && VALIDATED.includes(d.sheet.status),
  ).length;
  const transferred = sheets.filter((x) => x.status === "transferred").length;
  const developDone =
    input.direction.state === "approved" && total > 0 && validated === total;
  const stageValidated = input.stageState === "validated";

  const states: Record<JourneyStepKey, JourneyStepState> = {
    prepare: input.started ? "done" : "current",
    exchange:
      input.callSources > 0
        ? "done"
        : input.callsPlanned > 0
          ? "current"
          : input.started
            ? "skipped"
            : "todo",
    develop: developDone ? "done" : input.started ? "current" : "todo",
    consolidate:
      input.brief.latest !== null && input.brief.upToDate
        ? "done"
        : developDone || input.brief.latest !== null
          ? "current"
          : "todo",
    validate: stageValidated
      ? "done"
      : input.stageState === "awaiting_validation"
        ? "current"
        : "todo",
    production:
      total > 0 && transferred === total
        ? "done"
        : stageValidated || transferred > 0
          ? "current"
          : "todo",
  };
  const summaries: Record<JourneyStepKey, string> = {
    prepare: input.started ? s.prepareDone(total) : s.prepareTodo,
    exchange:
      input.callSources > 0
        ? s.exchangeDone(input.callSources)
        : input.callsPlanned > 0
          ? s.exchangePlanned(input.callsPlanned)
          : input.started
            ? s.exchangeSkipped
            : s.exchangeTodo,
    develop: s.develop(
      fr.conception.directionStates[input.direction.state],
      validated,
      total,
    ),
    consolidate:
      input.brief.latest === null
        ? s.consolidateTodo
        : input.brief.upToDate
          ? s.consolidateDone(input.brief.latest)
          : s.consolidateOutdated(input.brief.latest),
    validate: stageValidated
      ? s.validateDone
      : input.stageState === "awaiting_validation"
        ? s.validatePending
        : s.validateTodo,
    production: total ? s.production(transferred, total) : s.productionTodo,
  };

  return {
    steps: JOURNEY_STEPS.map((key) => ({
      key,
      state: states[key],
      summary: summaries[key],
    })),
    next: nextOf(input, developDone),
    blockers: blockersOf(input),
  };
}
