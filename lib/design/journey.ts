// The Conception as a journey of six steps (proto « Projet complet », module
// design, ticket « Workflow Conception complet »): Accueil, Intentions,
// Références, Direction artistique, Brief créatif, Fiches Livrables — the
// Brief before the sheets. Statuses, actors and summaries are computed here
// from what the project records (rule 6), never stored. Client-safe.

import { routes } from "@/lib/auth/redirects";
import { relaunchTodo, type ExchangeCall } from "@/lib/calls/exchange-todo";
import type { SheetPhase } from "@/lib/design/sheet-phase";
import { designJourney as frDesignJourney } from "@/lib/i18n/fr/design-journey";
import type {
  JourneyActor,
  JourneyPerson,
  JourneyRole,
  JourneyStatus,
  JourneyStep,
} from "@/lib/ui/journey";
import { formatShortDay } from "@/lib/utils/day";

const fr = { designJourney: frDesignJourney };

export const DESIGN_STEPS = [
  "home",
  "intentions",
  "references",
  "direction",
  "brief",
  "sheets",
] as const;
export type DesignStepKey = (typeof DESIGN_STEPS)[number];
export const isDesignStep = (v: unknown): v is DesignStepKey =>
  DESIGN_STEPS.includes(v as DesignStepKey);

export type DirectionPhase =
  "draft" | "pending" | "approved" | "changes_requested" | "rejected";

/** One sheet as the journey reads it. */
export type JourneySheet = {
  id: string;
  title: string;
  responsible: JourneyPerson | null;
  phase: SheetPhase;
  version: number;
  transferred: number | null;
};

export type DesignJourneyInput = {
  projectId: string;
  // Stratégie › Validation du Brief de sortie.
  strategy: { validated: boolean; version: number | null; at: string | null };
  owner: JourneyPerson | null;
  creative: JourneyPerson | null;
  // The direction's first validator (the label's direction by default).
  validator: JourneyPerson | null;
  path: "direct" | "call" | null;
  // The creative exchange created; `held` once its report exists.
  call: ExchangeCall | null;
  intentions: { proposed: number; confirmed: number };
  references: { total: number; unattached: number };
  direction: DirectionPhase;
  brief: number | null;
  sheets: JourneySheet[];
};

const t = fr.designJourney;

const actorOf = (
  who: JourneyPerson | null,
  todo: string,
  validate = false,
): JourneyActor | null =>
  who ? { ...who, todo, kind: validate ? "validate" : "do" } : null;

/** The sheet's next gesture and who makes it (proto actorsMk de3). */
export function sheetAction(
  sheet: JourneySheet,
  i: Pick<DesignJourneyInput, "owner" | "validator">,
): JourneyActor | null {
  if (sheet.phase === "transferred") return null;
  if (!sheet.responsible)
    return actorOf(i.owner, t.todo.sheetResponsible(sheet.title));
  if (sheet.phase === "submitted")
    return actorOf(i.validator, t.todo.sheetValidate(sheet.title), true);
  if (sheet.phase === "approved")
    return actorOf(i.owner, t.todo.sheetTransfer(sheet.title));
  return actorOf(
    sheet.responsible,
    sheet.phase === "changes" || sheet.phase === "refused"
      ? t.todo.sheetFix(sheet.title)
      : t.todo.sheetComplete(sheet.title),
  );
}

/** The six steps, for the person looking (owner / creative / validator). */
export function designJourney(i: DesignJourneyInput): JourneyStep[] {
  const role = (
    kind: JourneyRole["kind"],
    who: JourneyPerson | null,
    name: string,
  ): JourneyRole[] => (who ? [{ kind, name: who.name, role: name }] : []);
  const exec = role("exec", i.creative, t.roles.creative);
  const coord = role("coord", i.owner, t.roles.owner);
  const valid = role("valid", i.validator, t.roles.validator);
  const step = (
    key: DesignStepKey,
    status: JourneyStatus,
    rest: Partial<JourneyStep>,
  ): JourneyStep => ({
    key,
    href: routes.projectDesignStep(i.projectId, key),
    title: t.steps[key].title,
    why: t.steps[key].why,
    status,
    owner: null,
    validator: null,
    roles: [...exec, ...coord],
    prereq: [],
    next: [],
    actor: null,
    summary: null,
    ...rest,
  });

  // 1. Accueil: the responsible créatif, then the way in.
  const homeDone =
    Boolean(i.creative) &&
    (i.path === "direct" || (i.path === "call" && Boolean(i.call?.held)));
  const homeActor = !i.creative
    ? actorOf(i.owner, t.todo.designate)
    : !i.path
      ? actorOf(i.owner, t.todo.choose)
      : i.path === "call" && !i.call
        ? actorOf(i.owner, t.todo.createCall)
        : // Its processing failed: the owner relaunches the report.
          i.path === "call" && i.call?.failed
          ? actorOf(i.owner, relaunchTodo(i.call))
          : null;
  const home = step(
    "home",
    !i.strategy.validated ? "blocked" : homeDone ? "done" : "current",
    {
      roles: role("exec", i.owner, t.roles.owner),
      external: [
        {
          key: "strategy",
          label: t.strategyPrereq.label,
          module: t.strategyPrereq.module,
          done: i.strategy.validated,
          source:
            i.strategy.validated && i.strategy.version && i.strategy.at
              ? t.strategyPrereq.source(i.strategy.version, i.strategy.at)
              : undefined,
        },
      ],
      next: ["intentions"],
      actor: i.strategy.validated && !homeDone ? homeActor : null,
      summary: homeDone
        ? i.path === "call" && i.call
          ? t.summary.exchange(
              formatShortDay(i.call.occurredAt, { bare: true }),
            )
          : t.summary.direct
        : null,
    },
  );

  // 2. Intentions, confirmed one by one by the responsible créatif.
  const { proposed, confirmed } = i.intentions;
  const intentionsDone = homeDone && proposed === 0 && confirmed > 0;
  const intentions = step(
    "intentions",
    !homeDone ? "blocked" : intentionsDone ? "done" : "current",
    {
      prereq: ["home"],
      next: ["references"],
      actor:
        homeDone && !intentionsDone
          ? actorOf(
              i.creative,
              proposed ? t.todo.confirm(proposed) : t.todo.write,
            )
          : null,
      summary: intentionsDone ? t.summary.intentions(confirmed) : null,
    },
  );

  // 3. Références, each attached to the direction or a deliverable.
  const refsDone =
    intentionsDone && i.references.total > 0 && i.references.unattached === 0;
  const references = step(
    "references",
    !intentionsDone ? "blocked" : refsDone ? "done" : "current",
    {
      prereq: ["intentions"],
      next: ["direction"],
      actor:
        intentionsDone && !refsDone
          ? actorOf(
              i.creative,
              i.references.unattached
                ? t.todo.attach(i.references.unattached)
                : t.todo.addReferences,
            )
          : null,
      summary: refsDone ? t.summary.references(i.references.total) : null,
    },
  );

  // 4. Direction artistique, validated by the direction.
  const d = i.direction;
  const approved = refsDone && d === "approved";
  const direction = step(
    "direction",
    !refsDone
      ? "blocked"
      : d === "approved"
        ? "done"
        : d === "pending"
          ? "waiting"
          : "current",
    {
      roles: [...exec, ...coord, ...valid],
      prereq: ["references"],
      next: ["brief"],
      actor: !refsDone
        ? null
        : d === "pending"
          ? actorOf(i.validator, t.todo.validateDirection, true)
          : d === "approved"
            ? null
            : actorOf(
                i.creative,
                d === "changes_requested" || d === "rejected"
                  ? t.todo.resubmit
                  : t.todo.submitDirection(i.validator?.name ?? "—"),
              ),
      alert: refsDone && d === "pending" ? "decision" : undefined,
      summary: approved ? t.summary.direction : null,
    },
  );

  // 5. Brief créatif, assembled by code from what is validated.
  const briefDone = approved && i.brief !== null;
  const brief = step(
    "brief",
    !approved ? "blocked" : briefDone ? "done" : "current",
    {
      prereq: ["direction"],
      next: ["sheets"],
      actor:
        approved && !briefDone ? actorOf(i.creative, t.todo.brief(1)) : null,
      summary: briefDone ? t.summary.brief(i.brief!) : null,
    },
  );

  // 6. Fiches Livrables, each validated and transferred on its own.
  const actions = i.sheets.flatMap((s) => sheetAction(s, i) ?? []);
  const sheetsDone =
    briefDone &&
    i.sheets.length > 0 &&
    i.sheets.every((s) => s.phase === "transferred");
  const actor = actions.find((a) => a.viewer) ?? actions[0] ?? null;
  const sheets = step(
    "sheets",
    !briefDone ? "blocked" : sheetsDone ? "done" : "current",
    {
      roles: [...exec, ...coord, ...valid],
      prereq: ["brief"],
      nextExternal: [
        {
          key: "production",
          label: t.productionNext.label,
          module: t.productionNext.module,
        },
      ],
      actor: briefDone ? actor : null,
      alert: briefDone && actor?.kind === "validate" ? "decision" : undefined,
      summary: sheetsDone ? t.summary.sheets(i.sheets.length) : null,
    },
  );

  return [home, intentions, references, direction, brief, sheets];
}

/** The step a person lands on: their own open step, else the first open. */
export function designLanding(steps: JourneyStep[]): DesignStepKey {
  const mine = steps.find((s) => s.actor?.viewer);
  const open = steps.find((s) => s.status !== "done" && s.status !== "blocked");
  const key = (mine ?? open ?? steps[steps.length - 1]).key;
  return isDesignStep(key) ? key : "home";
}
