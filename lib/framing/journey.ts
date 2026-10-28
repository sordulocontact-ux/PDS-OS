// The Cadrage as a journey of four steps (proto « Projet complet »,
// FR_STEPS / frDone / frActors / frSummary; ticket « Cadrage intelligent »):
// Démarrer le cadrage, Les 6 dimensions, Brief de cadrage, Plan du projet.
// Statuses, actors and summaries are computed here from what the project
// records (rule 6), never stored. Client-safe.

import { routes } from "@/lib/auth/redirects";
import { framingJourney as frFramingJourney } from "@/lib/i18n/fr/framing-journey";
import type {
  JourneyPerson,
  JourneyRole,
  JourneyStatus,
  JourneyStep,
} from "@/lib/ui/journey";
import { formatShortDay } from "@/lib/utils/day";

const fr = { framingJourney: frFramingJourney };

export const FRAMING_STEPS = ["start", "dimensions", "brief", "plan"] as const;
export type FramingStepKey = (typeof FRAMING_STEPS)[number];
export const isFramingStep = (v: unknown): v is FramingStepKey =>
  FRAMING_STEPS.includes(v as FramingStepKey);

export type FramingJourneyInput = {
  projectId: string;
  owner: JourneyPerson | null;
  validator: JourneyPerson | null;
  // The framing call (framing_calls), when one was prepared.
  call: { occurredAt: string; held: boolean } | null;
  // Started straight with PO (framingStarted, no call).
  startedDirect: boolean;
  // Framing stage state (project_stages).
  stage: string;
  dimensions: { open: number; ready: boolean; confirmed: number };
  // The latest version of the Brief.
  brief: { version: number; state: string } | null;
  plan: { launchedAt: string } | null;
};

const t = fr.framingJourney;

/** The four steps, for the person looking (owner / validator flags). */
export function framingJourney(i: FramingJourneyInput): JourneyStep[] {
  const href = (key: FramingStepKey) =>
    routes.projectFramingStep(i.projectId, key);
  const exec: JourneyRole[] = i.owner
    ? [{ kind: "exec", name: i.owner.name, role: t.owner }]
    : [{ kind: "exec", name: "", role: t.owner }];
  const owned = (todo: string, kind: "do" | "validate" = "do") =>
    i.owner ? { ...i.owner, todo, kind } : null;

  const frozen = i.stage === "awaiting_validation";
  const validated = i.stage === "validated";
  const beyond = frozen || validated;

  // 1. Démarrer le cadrage → « Échange de cadrage » or « Départ ».
  const startDone = beyond || Boolean(i.call?.held) || i.startedDirect;
  const start: JourneyStep = {
    key: "start",
    href: href("start"),
    title: i.call
      ? t.steps.start.titleCall
      : i.startedDirect || beyond
        ? t.steps.start.titleDirect
        : t.steps.start.title,
    // Once the exchange is prepared, the choice is made: no « why » about
    // the two ways in (Sacha 28/10).
    why: i.call ? "" : t.steps.start.why,
    status: startDone ? "done" : "current",
    owner: null,
    validator: null,
    roles: exec,
    prereq: [],
    next: ["dimensions"],
    actor: startDone ? null : owned(i.call ? t.todo.hold : t.todo.start),
    summary: startDone
      ? i.call?.held
        ? t.summary.exchange(formatShortDay(i.call.occurredAt, { bare: true }))
        : t.summary.direct
      : null,
  };

  // 2. Les 6 dimensions: frozen while the Brief is read, reopened only
  // where the direction asked.
  const changes = i.brief?.state === "changes_requested";
  const dimsStatus: JourneyStatus = !startDone
    ? "blocked"
    : beyond
      ? "done"
      : i.dimensions.ready
        ? changes
          ? "rework"
          : "done"
        : "current";
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
    next: ["brief"],
    actor:
      dimsStatus === "current" && i.dimensions.open > 0
        ? owned(t.todo.answer(i.dimensions.open))
        : null,
    summary:
      dimsStatus === "done"
        ? t.summary.confirmed(i.dimensions.confirmed)
        : null,
  };

  // 3. Brief de cadrage, validated by the direction in the step. Its
  // versions stay readable once there is one (§ 7: never hidden).
  const v = i.brief;
  const readyForBrief = startDone && i.dimensions.ready;
  let briefStatus: JourneyStatus;
  let briefActor: JourneyStep["actor"] = null;
  if (validated) briefStatus = "done";
  else if (v?.state === "sent") {
    briefStatus = "waiting";
    briefActor = i.validator
      ? { ...i.validator, todo: t.todo.validate, kind: "validate" }
      : null;
  } else if (v || readyForBrief) {
    // One gesture: the version is made and sent (Sacha 28/10/2026).
    briefStatus = "current";
    briefActor = readyForBrief ? owned(t.todo.send) : null;
  } else briefStatus = "blocked";
  const brief: JourneyStep = {
    key: "brief",
    href: href("brief"),
    title: t.steps.brief.title,
    why: t.steps.brief.why,
    status: briefStatus,
    owner: null,
    validator: null,
    roles: [
      ...exec,
      ...(i.validator
        ? [
            {
              kind: "valid" as const,
              name: i.validator.name,
              role: t.validatorRole,
            },
          ]
        : []),
    ],
    prereq: ["dimensions"],
    next: ["plan"],
    actor: briefActor,
    summary: validated && v ? t.summary.validated(v.version) : null,
  };

  // 4. Plan du projet: « Lancer le plan » starts every workflow.
  const planStatus: JourneyStatus = !validated
    ? "blocked"
    : i.plan
      ? "done"
      : "current";
  const plan: JourneyStep = {
    key: "plan",
    href: href("plan"),
    title: t.steps.plan.title,
    why: t.steps.plan.why,
    status: planStatus,
    owner: null,
    validator: null,
    roles: exec,
    prereq: ["brief"],
    next: [],
    nextExternal: [
      {
        key: "strategy",
        label: t.strategyNext.label,
        module: t.strategyNext.module,
      },
    ],
    actor: planStatus === "current" ? owned(t.todo.launch) : null,
    summary: i.plan
      ? t.summary.launched(formatShortDay(i.plan.launchedAt, { bare: true }))
      : null,
  };

  return [start, dimensions, brief, plan];
}

/** The step a person lands on: their own open step, else the first open. */
export function framingLanding(steps: JourneyStep[]): FramingStepKey {
  const mine = steps.find((s) => s.actor?.viewer);
  const open = steps.find((s) => s.status !== "done" && s.status !== "blocked");
  const key = (mine ?? open ?? steps[steps.length - 1]).key;
  return isFramingStep(key) ? key : "start";
}
