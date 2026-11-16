// The Distribution as a journey of seven steps in four sections (proto
// « Projet complet », docs/protos/distribution.html): Préparation,
// Paramètres de distribution, Dossier de livraison (Dossier) · Dépôt dans The
// Orchard, Réponse de The Orchard (Dépôt) · Plateformes (En ligne) ·
// Clôture. Pure and client-safe: every state comes from what people
// recorded or declared, never from PO (CLAUDE.md, rule 6). Where each step
// lives: lib/ui/distribution-steps.ts.

import { distribution } from "@/lib/i18n/fr/distribution";
import { distributionJourney as frDistributionJourney } from "@/lib/i18n/fr/distribution-journey";
import type {
  JourneyActor,
  JourneyNext,
  JourneyPerson,
  JourneyPrereq,
  JourneyStep,
} from "@/lib/ui/journey";
import {
  DISTRIBUTION_STEPS,
  distributionStepHref,
  type DistributionStep,
} from "@/lib/ui/distribution-steps";

const fr = { distribution, distributionJourney: frDistributionJourney };

const t = fr.distributionJourney;

export type DistributionJourneyInput = {
  projectId: string;
  // A collective's release (lot 15), kept in every step's address.
  releaseId?: string | null;
  // The project's responsible; `viewer` = the one looking.
  owner: JourneyPerson | null;
  // The validator designated in the parameters, else the one proposed.
  validator: JourneyPerson | null;
  prep: {
    ready: number;
    total: number;
    blockers: number;
    // The other modules the dossier waits for (Master, Conception,
    // Juridique), with whether each is there.
    sources: JourneyPrereq[];
  };
  params: { confirmedBy: string | null } | null;
  // « Juridique › Prêt pour la sortie » (loadLegalReadiness), what the
  // deposit waits for from the Juridique.
  legalReady: JourneyPrereq | null;
  dossier: {
    // The number of the version being prepared or decided.
    number: number;
    // The latest version not superseded.
    open: { number: number; status: "pending" | "approved" } | null;
    // The latest decision was a refusal (the next one is to submit).
    rejected: boolean;
    // A source changed since the approved version (§ 13).
    drift: boolean;
  };
  // The current deposit cycle (approved version), declarations by kind.
  cycle: {
    deposit: { proof: boolean } | null;
    received: boolean;
    accepted: boolean;
    delivered: boolean;
  } | null;
  platforms: {
    verified: number;
    // The five verified, available and compliant.
    done: boolean;
    // No link yet, neither found by the detection nor given by someone.
    noLink: boolean;
    // Every reference platform was looked at.
    allLooked: boolean;
    openAnomalies: number;
    // The release date: the detection starts that day.
    releaseDay: string | null;
  };
  closure: {
    status: "pending" | "closed" | "rejected";
    kind: "normal" | "reserves" | "cancelled" | "abandoned";
    reserves: number;
    // Reserves not lifted yet (recette DIST-007): the step stays amber.
    openReserves: number;
    // Decided by the direction (cancelled, abandoned, ahead of time).
    direction: boolean;
  } | null;
};

const GROUP: Record<DistributionStep, string> = {
  prep: t.groups.dossier,
  params: t.groups.dossier,
  dossier: t.groups.dossier,
  deposit: t.groups.deposit,
  orchard: t.groups.deposit,
  platforms: t.groups.online,
  closure: t.groups.closure,
};

const PREREQ: Record<DistributionStep, DistributionStep[]> = {
  prep: [],
  params: [],
  dossier: ["params"],
  deposit: ["dossier"],
  orchard: ["deposit"],
  platforms: ["orchard"],
  // Possible once deposited: with reserves after the acceptance, before
  // it only by a decision of the direction (recette DIST-003).
  closure: ["deposit"],
};

const NEXT_ELSEWHERE: Partial<Record<DistributionStep, JourneyNext[]>> = {
  prep: [{ key: "submission", label: t.nextOf.prep }],
  platforms: [{ key: "normal", label: t.nextOf.platforms }],
  closure: [{ key: "project", label: t.nextOf.closure }],
};

type Outcome = {
  done: boolean;
  summary: string | null;
  actor: JourneyActor | null;
  // Open, but waiting for a third party (The Orchard, the detection).
  waiting?: boolean;
  // Done, then a source changed (rework) or closed with reserves.
  rework?: boolean;
  reserve?: boolean;
  alert?: JourneyStep["alert"];
};

/** The seven steps, their state, who acts and what they gave. */
export function distributionJourney(
  input: DistributionJourneyInput,
): JourneyStep[] {
  const i = input;
  const owner = (todo: string): JourneyActor | null =>
    i.owner ? { ...i.owner, todo, kind: "do" } : null;
  const validator = (todo: string): JourneyActor | null =>
    i.validator ? { ...i.validator, todo, kind: "validate" } : null;
  const third = (name: string, todo: string): JourneyActor => ({
    name,
    viewer: false,
    viaLink: false,
    todo,
  });
  const n = i.dossier.number;
  const cycle = i.cycle;

  const outcomes: Record<DistributionStep, Outcome> = {
    prep:
      i.prep.blockers === 0
        ? {
            done: true,
            summary: t.summary.prepReady(i.prep.ready, i.prep.total),
            actor: null,
          }
        : {
            done: false,
            summary: t.summary.prepBlocking(i.prep.blockers),
            actor: null,
            alert: "blocking",
          },
    params: i.params
      ? {
          done: true,
          summary: t.summary.paramsConfirmed(i.params.confirmedBy),
          actor: null,
        }
      : { done: false, summary: null, actor: owner(t.todo.confirmParams) },
    dossier:
      i.dossier.open?.status === "approved"
        ? {
            done: true,
            summary: t.summary.dossierApproved(i.dossier.open.number),
            actor: i.dossier.drift ? owner(t.todo.prepareNext(n + 1)) : null,
            rework: i.dossier.drift,
          }
        : i.dossier.open?.status === "pending"
          ? {
              done: false,
              summary: null,
              actor: validator(t.todo.validate(i.dossier.open.number)),
            }
          : {
              done: false,
              summary: null,
              actor: owner(
                i.prep.blockers > 0
                  ? t.todo.controlDossier(n)
                  : t.todo.submit(n),
              ),
            },
    deposit: cycle?.deposit
      ? {
          done: true,
          summary: cycle.deposit.proof
            ? t.summary.depositProven
            : t.summary.depositDeclared,
          actor: null,
        }
      : { done: false, summary: null, actor: owner(t.todo.deposit) },
    orchard:
      cycle && cycle.received && cycle.accepted && cycle.delivered
        ? { done: true, summary: t.summary.orchardDone, actor: null }
        : {
            done: false,
            summary: null,
            waiting: true,
            actor: third(
              t.distributor,
              !cycle?.received
                ? t.todo.receive
                : !cycle.accepted
                  ? t.todo.accept
                  : t.todo.deliver,
            ),
          },
    platforms: platformsOutcome(i, owner, third),
    closure: closureOutcome(i, owner, validator),
  };

  const status = new Map<DistributionStep, JourneyStep["status"]>();
  return DISTRIBUTION_STEPS.map((key) => {
    const o = outcomes[key];
    const ready = PREREQ[key].every(
      (p) => status.get(p) === "done" || status.get(p) === "rework",
    );
    const st: JourneyStep["status"] = !ready
      ? "blocked"
      : o.rework
        ? "rework"
        : o.done
          ? "done"
          : o.waiting
            ? "waiting"
            : "current";
    status.set(key, st);
    const isValidated = key === "dossier" || key === "closure";
    return {
      key,
      href: distributionStepHref(i.projectId, key, i.releaseId),
      title: t.steps[key].title,
      why: t.steps[key].why,
      status: st,
      owner:
        key === "prep"
          ? { ...t.computed }
          : i.owner
            ? { name: i.owner.name, role: t.ownerRole }
            : null,
      validator: isValidated
        ? {
            name: i.validator?.name ?? t.toAppoint,
            role: t.validatorRole,
          }
        : null,
      prereq: PREREQ[key],
      external:
        key === "prep"
          ? i.prep.sources
          : key === "deposit" && i.legalReady
            ? [i.legalReady]
            : undefined,
      next: DISTRIBUTION_STEPS.filter((k) => PREREQ[k].includes(key)),
      nextExternal: NEXT_ELSEWHERE[key],
      actor: st === "blocked" ? null : o.actor,
      summary: o.summary,
      group: GROUP[key],
      alert: st === "done" ? undefined : o.alert,
      reserve: o.reserve,
    };
  });
}

function platformsOutcome(
  i: DistributionJourneyInput,
  owner: (todo: string) => JourneyActor | null,
  third: (name: string, todo: string) => JourneyActor,
): Outcome {
  const p = i.platforms;
  if (p.done)
    return { done: true, summary: t.summary.platformsDone, actor: null };
  // Closed (with reserves): the step is over like the workflow, with the
  // reserve mark (never green, never « En cours »); nobody is asked to
  // verify any more and a reopening brings the question back (recette).
  if (i.closure?.status === "closed")
    return {
      done: true,
      summary:
        i.closure.kind === "cancelled" || i.closure.kind === "abandoned"
          ? t.summary.closedStopped(
              fr.distribution.closure.kinds[i.closure.kind],
            )
          : t.summary.closedReserves(i.closure.reserves),
      actor: null,
      reserve: true,
    };
  if (p.noLink)
    return {
      done: false,
      summary: null,
      waiting: true,
      actor: third(
        t.todo.detection,
        p.releaseDay
          ? t.todo.detectionTodo(p.releaseDay)
          : t.todo.detectionTodoUndated,
      ),
    };
  if (p.openAnomalies > 0 && p.allLooked)
    return { done: false, summary: null, actor: owner(t.todo.followAnomaly) };
  return {
    done: false,
    summary: null,
    actor: owner(p.verified < 5 ? t.todo.verify(p.verified) : t.todo.reverify),
  };
}

function closureOutcome(
  i: DistributionJourneyInput,
  owner: (todo: string) => JourneyActor | null,
  validator: (todo: string) => JourneyActor | null,
): Outcome {
  const c = i.closure;
  if (
    c?.status === "closed" &&
    (c.kind === "cancelled" || c.kind === "abandoned")
  )
    return {
      done: true,
      summary: t.summary.closedStopped(fr.distribution.closure.kinds[c.kind]),
      actor: null,
      reserve: true,
    };
  // Closed with reserves still open: never green (recette DIST-007), the
  // reserves' lifting is what remains.
  if (c?.status === "closed" && c.openReserves > 0)
    return {
      done: true,
      rework: true,
      summary: t.summary.closedReservesOpen(c.reserves, c.openReserves),
      actor: owner(t.todo.liftReserves(c.openReserves)),
      reserve: true,
    };
  if (c?.status === "closed")
    return {
      done: true,
      summary:
        c.reserves > 0
          ? t.summary.closedReserves(c.reserves)
          : t.summary.closedNormal,
      actor: null,
      reserve: c.reserves > 0,
    };
  if (c?.status === "pending")
    return {
      done: false,
      summary: null,
      // The direction decides a closure ahead of time; it is not a person
      // of the journey, the validator stands for it.
      actor: validator(t.todo.validateClosure),
    };
  // Refused, or the platforms all verified: the owner proposes it; before
  // that, possible with reserves, nobody is expected.
  if (c?.status === "rejected" || i.platforms.done)
    return { done: false, summary: null, actor: owner(t.todo.proposeClosure) };
  return { done: false, summary: t.summary.closurePossible, actor: null };
}

export type DistributionStatus =
  "not_started" | "in_progress" | "waiting" | "blocked" | "done";

/**
 * The workflow's state next to its title (proto `wfStatus`): Terminé once
 * closed, Bloqué while a source blocks the dossier, En attente when nobody
 * of PDS can act (a validation asked, The Orchard, the detection), else En
 * cours. Computed from the journey, never stored.
 */
export function distributionStatus(steps: JourneyStep[]): DistributionStatus {
  const step = (key: DistributionStep) => steps.find((s) => s.key === key);
  if (steps.length === 0) return "not_started";
  if (step("closure")?.status === "done") return "done";
  if (step("prep")?.status !== "done") return "blocked";
  const acting = steps.filter((s) => s.actor && s.status !== "blocked");
  if (
    acting.length > 0 &&
    acting.every((s) => s.status === "waiting" || s.actor?.kind === "validate")
  )
    return "waiting";
  return "in_progress";
}
