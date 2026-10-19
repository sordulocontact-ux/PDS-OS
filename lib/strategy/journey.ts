// The Stratégie as a journey of four steps (proto « Projet complet »,
// MK_STEPS st1–st4, doneMk, actorsMk, summaryMk; ticket « Workflow
// Stratégie complet »): Démarrer la stratégie, Les 8 dimensions,
// Validation du Brief de sortie, Stratégie validée. Statuses, actors and
// summaries are computed here from what the project records (rule 6),
// never stored. Client-safe.

import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type {
  JourneyActor,
  JourneyPerson,
  JourneyRole,
  JourneyStatus,
  JourneyStep,
} from "@/lib/ui/journey";
import { formatShortDay } from "@/lib/utils/day";

export const STRATEGY_STEPS = [
  "start",
  "dimensions",
  "validation",
  "validated",
] as const;
export type StrategyStepKey = (typeof STRATEGY_STEPS)[number];
export const isStrategyStep = (v: unknown): v is StrategyStepKey =>
  STRATEGY_STEPS.includes(v as StrategyStepKey);

export type StrategyValidator = JourneyPerson & {
  personId: string;
  role: "direction" | "creative";
};

export type StrategyJourneyInput = {
  projectId: string;
  owner: JourneyPerson | null;
  // Who validates the Brief: the reviewers of the version in flight, else
  // the direction and the project's creative directors.
  validators: StrategyValidator[];
  plan: { launched: boolean; at: string | null };
  // launch_strategy's state.
  stage: string;
  // « Commencer la stratégie » (strategy_workspaces), or a call filed.
  started: boolean;
  call: { occurredAt: string; held: boolean } | null;
  dims: {
    ready: boolean;
    pending: number;
    confirmed: number;
    firstToDecide: string | null;
    firstToComplete: string | null;
  };
  // The latest version of the Brief de sortie, and its reviewers pending.
  brief: { version: number; state: string; waiting: JourneyPerson[] } | null;
  approved: { version: number } | null;
  revisionOpen: boolean;
  documents: { plan: string; press: string };
};

const t = fr.strategyJourney;
const dimName = (key: string) =>
  fr.strategyDimensions.names[
    key as keyof typeof fr.strategyDimensions.names
  ] ?? key;

/** The four steps, for the person looking (owner / validator flags). */
export function strategyJourney(i: StrategyJourneyInput): JourneyStep[] {
  const href = (key: StrategyStepKey) =>
    routes.projectStrategyStep(i.projectId, key);
  const exec: JourneyRole[] = [
    { kind: "exec", name: i.owner?.name ?? "", role: t.owner },
  ];
  const owned = (todo: string): JourneyActor | null =>
    i.owner ? { ...i.owner, todo, kind: "do" } : null;

  const validated = i.stage === "validated" && !i.revisionOpen;
  const sent = i.brief?.state === "sent";
  const returned = i.brief?.state === "changes_requested";
  const beyond = validated || sent || i.stage === "awaiting_validation";

  // 1. Démarrer la stratégie → « Échange stratégique » or « Départ ».
  const startDone =
    beyond || i.started || Boolean(i.call?.held) || Boolean(i.approved);
  const start: JourneyStep = {
    key: "start",
    href: href("start"),
    title: i.call
      ? t.steps.start.titleCall
      : startDone
        ? t.steps.start.titleDirect
        : t.steps.start.title,
    why: t.steps.start.why,
    status: !i.plan.launched ? "blocked" : startDone ? "done" : "current",
    owner: null,
    validator: null,
    roles: exec,
    prereq: [],
    external: [
      {
        key: "plan",
        label: t.plan.label,
        module: t.plan.module,
        done: i.plan.launched,
        source: i.plan.at
          ? t.plan.launched(formatShortDay(i.plan.at, { bare: true }))
          : undefined,
      },
    ],
    next: ["dimensions"],
    actor:
      i.plan.launched && !startDone
        ? owned(i.call ? t.todo.hold : t.todo.start)
        : null,
    summary: startDone
      ? i.call?.held
        ? t.summary.exchange(formatShortDay(i.call.occurredAt, { bare: true }))
        : t.summary.direct
      : null,
  };

  // 2. Les 8 dimensions: frozen while the Brief is read, reopened when the
  // direction asks for a change.
  const d = i.dims;
  const dimsStatus: JourneyStatus =
    start.status !== "done"
      ? "blocked"
      : beyond
        ? "done"
        : d.ready
          ? returned
            ? "rework"
            : "done"
          : "current";
  const dimsTodo =
    d.pending > 0
      ? t.todo.confirm(d.pending)
      : d.firstToDecide
        ? t.todo.arbitrate(dimName(d.firstToDecide))
        : d.firstToComplete
          ? t.todo.complete(dimName(d.firstToComplete))
          : null;
  const dimensions: JourneyStep = {
    key: "dimensions",
    href: href("dimensions"),
    title: t.steps.dimensions.title,
    why: t.steps.dimensions.why,
    status: dimsStatus,
    owner: null,
    validator: null,
    roles: exec,
    prereq: ["start"],
    next: ["validation"],
    actor: dimsStatus === "current" && dimsTodo ? owned(dimsTodo) : null,
    summary:
      dimsStatus === "done" || dimsStatus === "rework"
        ? t.summary.established(d.confirmed)
        : null,
  };

  // 3. Validation du Brief de sortie, decided by each validator in place.
  const roles: JourneyRole[] = [
    ...exec,
    ...i.validators.map((v) => ({
      kind: "valid" as const,
      name: v.name,
      role: v.role === "direction" ? t.direction : t.creative,
    })),
  ];
  let status: JourneyStatus;
  let actor: JourneyActor | null = null;
  if (validated) status = "done";
  else if (sent) {
    status = "waiting";
    const waiting = i.brief?.waiting ?? [];
    const me = waiting.find((p) => p.viewer);
    actor =
      waiting.length > 0
        ? {
            ...(me ?? waiting[0]),
            name: me ? me.name : t.names(waiting.map((p) => p.name)),
            todo: t.todo.validate,
            kind: "validate",
          }
        : null;
  } else if (returned) {
    status = "current";
    actor = owned(t.todo.resubmit);
  } else if (dimensions.status === "done") {
    status = "current";
    actor = owned(t.todo.send);
  } else status = "blocked";
  const validation: JourneyStep = {
    key: "validation",
    href: href("validation"),
    title: t.steps.validation.title,
    why: t.steps.validation.why,
    status,
    owner: null,
    validator: null,
    roles,
    prereq: ["dimensions"],
    next: ["validated"],
    nextExternal: [
      { key: "design", ...t.nextExternal.design },
      { key: "activations", ...t.nextExternal.activations },
    ],
    actor,
    summary: i.approved ? t.summary.validated(i.approved.version) : null,
  };

  // 4. Stratégie validée: the documents and what the decisions feed. A
  // revision in progress keeps the validated version as the reference.
  const v = i.approved?.version ?? 1;
  const validatedStep: JourneyStep = {
    key: "validated",
    href: href("validated"),
    title: t.steps.validated.title,
    why: t.steps.validated.why(v),
    status: i.approved ? "done" : "blocked",
    owner: null,
    validator: null,
    roles: exec,
    prereq: ["validation"],
    next: [],
    actor: null,
    summary: i.approved
      ? t.summary.final(v, i.documents.plan, i.documents.press)
      : null,
  };

  return [start, dimensions, validation, validatedStep];
}

/** The step a person lands on: their own open step, else the first open. */
export function strategyLanding(steps: JourneyStep[]): StrategyStepKey {
  const mine = steps.find((s) => s.actor?.viewer);
  const open = steps.find((s) => s.status !== "done" && s.status !== "blocked");
  const done = [...steps].reverse().find((s) => s.status === "done");
  const key = (mine ?? open ?? done ?? steps[0]).key;
  return isStrategyStep(key) ? key : "start";
}
