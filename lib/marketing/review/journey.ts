// Marketing › Suivi & bilan as a journey of three steps (proto « Projet
// complet », mk.js `bi1`–`bi3`, `actorsMk`, `summaryMk`): Bilan provisoire,
// Réserves, Clôture du Marketing. Pure: every state comes from the reports,
// their decisions, the reserves and the closings people recorded, never
// from PO (CLAUDE.md, rule 6). The project's responsible prepares, submits,
// arbitrates and asks; the direction (the holder of « validate ») decides.

import { fr } from "@/lib/i18n/fr";
import type { MarketingClosure } from "@/lib/marketing/closure/queries";
import type { Approval } from "@/lib/marketing/reports/approvals";
import type { ReportVersion } from "@/lib/marketing/reports/model";
import type { Reserve } from "@/lib/marketing/reserves/queries";
import type {
  JourneyActor,
  JourneyRole,
  JourneyStep,
  JourneyStatus,
} from "@/lib/ui/journey";
import { reviewStepHref, type ReviewStepKey } from "@/lib/ui/review-steps";

const t = fr.reviewJourney;

type Person = { personId: string; name: string };

export type ReviewJourneyInput = {
  projectId: string;
  viewerId: string | null;
  owner: Person | null;
  // The direction: the organisation's one holder of « validate ».
  validator: Person | null;
  activationsCount: number;
  // The release (ISO day): the bilan is prepared from that day on.
  releaseDate: string | null;
  today: string;
  // Newest first.
  reports: ReportVersion[];
  approvals: Approval[];
  reserves: Reserve[];
  closures: MarketingClosure[];
};

export type ReviewJourneyStep = Omit<JourneyStep, "key"> & {
  key: ReviewStepKey;
};

// A version still on its way: generated, asked to decide, sent back.
const OPEN_REPORT = [
  "generated",
  "to_validate",
  "changes_requested",
  "postponed",
];

/** The newest version approved as a provisional bilan (or finalized by a
 * closing since reopened): the reference of the reserves and the closing. */
export const referenceOf = (reports: ReportVersion[]) =>
  reports.find(
    (r) => r.state === "approved_provisional" || r.state === "finalized",
  ) ?? null;

/** The closing in force: asked, or decided closed. */
export const activeClosureOf = (closures: MarketingClosure[]) =>
  closures.find(
    (c) =>
      c.state === "requested" ||
      c.state === "closed_clean" ||
      c.state === "closed_with_reserves",
  ) ?? null;

export const isClosedState = (state: string) =>
  state === "closed_clean" || state === "closed_with_reserves";

/** Reserves no closing may pass: not arbitrated, or « à lever » not lifted. */
export const reservesInTheWay = (reserves: Reserve[]) => ({
  unarbitrated: reserves.filter((r) => r.status === "open"),
  toLift: reserves.filter(
    (r) => r.status === "arbitrated" && r.decision === "blocking",
  ),
});

export function reviewJourney(input: ReviewJourneyInput): ReviewJourneyStep[] {
  const { owner, validator, reports, reserves, closures, viewerId } = input;
  const actor = (
    who: Person | null,
    todo: string,
    kind: "do" | "validate" = "do",
  ): JourneyActor | null =>
    who
      ? {
          name: who.name,
          viewer: viewerId !== null && viewerId === who.personId,
          viaLink: false,
          todo,
          kind,
        }
      : null;
  const roles: JourneyRole[] = [
    ...(owner
      ? [{ kind: "exec" as const, name: owner.name, role: t.roles.owner }]
      : []),
    ...(validator
      ? [
          {
            kind: "valid" as const,
            name: validator.name,
            role: t.roles.validator,
          },
        ]
      : []),
  ];
  const href = (key: ReviewStepKey) => reviewStepHref(input.projectId, key);

  // 1. Bilan provisoire.
  const latest = reports[0] ?? null;
  const reference = referenceOf(reports);
  const open = latest !== null && OPEN_REPORT.includes(latest.state);
  const bilanDone = reference !== null && !open;
  const released =
    input.releaseDate === null || input.today >= input.releaseDate;
  let bilanActor: JourneyActor | null = null;
  if (!bilanDone && input.activationsCount > 0) {
    if (!latest || latest.state === "changes_requested")
      bilanActor = released
        ? actor(owner, t.todo.prepare((latest?.version ?? 0) + 1))
        : null;
    else if (latest.state === "generated")
      bilanActor = actor(owner, t.todo.submit);
    else if (latest.state === "postponed")
      bilanActor = actor(owner, t.todo.resubmit(latest.version));
    else if (latest.state === "to_validate")
      bilanActor = actor(validator, t.todo.approve, "validate");
  }
  const bilanLocked = input.activationsCount === 0 && reports.length === 0;
  const status = (done: boolean, locked: boolean): JourneyStatus =>
    done ? "done" : locked ? "blocked" : "current";

  // 2. Réserves.
  const { unarbitrated, toLift } = reservesInTheWay(reserves);
  const reservesDone =
    reference !== null && unarbitrated.length === 0 && toLift.length === 0;
  const reservesActor =
    reference === null || reservesDone
      ? null
      : unarbitrated.length > 0
        ? actor(owner, t.todo.arbitrate(unarbitrated.length))
        : actor(owner, t.todo.lift(toLift[0].description));

  // 3. Clôture du Marketing.
  const active = activeClosureOf(closures);
  const closed = active !== null && isClosedState(active.state);
  const closureActor =
    !reservesDone || closed
      ? null
      : active?.state === "requested"
        ? actor(validator, t.todo.close, "validate")
        : actor(owner, t.todo.request);

  return [
    {
      key: "bilan",
      href: href("bilan"),
      title: t.steps.bilan.title,
      why: t.steps.bilan.why,
      status: status(bilanDone, bilanLocked),
      owner: null,
      validator: null,
      roles,
      prereq: [],
      external: [
        {
          key: "activations",
          label: t.prereq.label,
          module: t.prereq.module,
          done: input.activationsCount > 0,
        },
      ],
      next: ["reserves"],
      actor: bilanActor,
      summary:
        bilanDone && reference
          ? t.summary.bilan(
              reference.version,
              input.approvals.some(
                (a) =>
                  a.reportId === reference.id &&
                  a.decision === "approved_provisional" &&
                  a.reservesCount > 0,
              ),
            )
          : null,
    },
    {
      key: "reserves",
      href: href("reserves"),
      title: t.steps.reserves.title,
      why: t.steps.reserves.why,
      status: status(reservesDone, reference === null),
      owner: null,
      validator: null,
      roles,
      prereq: ["bilan"],
      next: ["closure"],
      actor: reservesActor,
      summary: reservesDone ? t.summary.reserves(reserves.length) : null,
    },
    {
      key: "closure",
      href: href("closure"),
      title: t.steps.closure.title,
      why: t.steps.closure.why,
      status: status(closed, !reservesDone),
      owner: null,
      validator: null,
      roles,
      prereq: ["reserves"],
      next: [],
      actor: closureActor,
      summary: closed
        ? t.summary.closure(active?.state === "closed_with_reserves")
        : null,
      reserve: active?.state === "closed_with_reserves",
    },
  ];
}
