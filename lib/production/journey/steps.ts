// The steps of each organisation (Ibé, 14/10; proto « Projet complet »,
// production.md § 1), their state, who executes, coordinates and validates,
// and who acts now. Pure, client-safe; every state comes from recorded
// data, never from PO.

import { formatEuros } from "@/lib/budget/types";
import { productionCut } from "@/lib/i18n/fr/production-cut";
import { productionJourney } from "@/lib/i18n/fr/production-journey";
import { productionLight } from "@/lib/i18n/fr/production-light";
import { productionProposal } from "@/lib/i18n/fr/production-proposal";
import { type JourneyRole, nowOf } from "@/lib/ui/journey";
import { formatShortDay } from "@/lib/utils/day";

import { stepHref } from "./href";

import type {
  JourneyActor,
  JourneyInput,
  JourneyPerson,
  JourneyStep,
  StepKey,
} from "./types";

const fr = {
  productionJourney,
  productionProposal,
  productionLight,
  productionCut,
};

const t = fr.productionJourney;
const r = t.roles;

type Def = {
  key: StepKey;
  prereq: StepKey[];
  // A prerequisite of another journey (« Montage du clip validé »).
  gate?: { label: string; source: string; done: boolean } | null;
  roles: (JourneyRole | null)[];
  done: boolean;
  // Who acts now when the step is open.
  act: (() => JourneyActor | null) | null;
  summary: string | null;
};

const actor = (
  p: JourneyPerson | null,
  todo: string,
  kind: JourneyActor["kind"] = "do",
): JourneyActor | null => (p ? { ...p, todo, kind } : null);

const role = (
  kind: JourneyRole["kind"],
  p: JourneyPerson | null,
  label: string,
): JourneyRole | null =>
  p ? { kind, name: p.name, role: label, viaLink: p.viaLink } : null;

const SHOT = ["shot", "post", "final_check", "delivered", "handed_off"];
const POSTED = ["final_check", "delivered", "handed_off"];
// Steps that never open before their prerequisites are done.
const LATER: readonly StepKey[] = ["shoot", "rushes", "post", "delivery"];

export function journeySteps(input: JourneyInput): JourneyStep[] {
  const i = input;
  // Before « Qui produit ? » is answered, the journey is that step alone
  // (proto prodSteps): the rest depends on the answer.
  const defs =
    i.kind === null
      ? [whoProduces(i)]
      : i.track === "shoot"
        ? stepsOf(i)
        : lightSteps(i);
  const status = new Map<StepKey, JourneyStep["status"]>();
  return defs.map((def) => {
    const ready =
      def.prereq.every((p) => status.get(p) === "done") &&
      (def.gate?.done ?? true);
    // A step done, to review after a change elsewhere, stays passed for
    // the next ones: nothing is blocked by a review (proto rule 14).
    const rework = def.done && i.reworkSteps.includes(def.key);
    const st: JourneyStep["status"] = rework
      ? "rework"
      : def.done
        ? "done"
        : ready
          ? "current"
          : LATER.includes(def.key)
            ? "upcoming"
            : "blocked";
    status.set(def.key, def.done ? "done" : st);
    const open = st === "current" || st === "rework";
    return {
      key: def.key,
      href: stepHref(i.projectId, i.deliverableId, def.key),
      title: titleOf(def.key, i),
      why: whyOf(def.key, i),
      status: st,
      owner: null,
      validator: null,
      roles: def.roles.filter((x): x is JourneyRole => x !== null),
      prereq: def.prereq,
      external: def.gate
        ? [
            {
              key: "gate",
              label: def.gate.label,
              done: def.gate.done,
              module: def.gate.source,
            },
          ]
        : undefined,
      next: defs.filter((x) => x.prereq.includes(def.key)).map((x) => x.key),
      actor: open && def.act ? def.act() : null,
      summary: def.summary,
      blocked: i.blockedSteps.includes(def.key),
    };
  });
}

function whoProduces(i: JourneyInput): Def {
  return {
    key: "organisation",
    prereq: [],
    roles: [role("exec", i.owner, r.owner)],
    done: i.opened && i.kind !== null,
    act: () => actor(i.owner, t.todo.organize),
    summary: i.kind
      ? i.track === "derived"
        ? fr.productionLight.derived
        : i.kind === "external"
          ? t.summary.organization.external(i.company?.name ?? "—")
          : t.summary.organization.internal
      : null,
  };
}

// A cover, or teasers drawn from the clip (proto lightSteps, PR-13):
// Versions → Contrôle technique → Livraison, three distinct decisions.
function lightSteps(i: JourneyInput): Def[] {
  const L = i.light;
  const tl = fr.productionLight;
  const ext = i.kind === "external";
  const exec = ext ? i.company : i.producer;
  const last = L.latest;
  const sentBack =
    last?.status === "changes_requested" || last?.status === "refused";
  const versions: Def = {
    key: "post",
    prereq: ["organisation"],
    gate: L.gate && { label: tl.gate, source: L.gate.clip, done: L.gate.done },
    roles: [
      role("exec", exec, ext ? r.company : r.producer),
      role("coord", i.owner, r.owner),
      role("valid", i.creative, r.creativeInt),
      ext ? role("valid", i.creativeExt, r.creativeExt) : null,
    ],
    done: L.approved !== null,
    act: () =>
      !last || sentBack
        ? actor(exec, tl.todo.deposit((last?.number ?? 0) + 1))
        : actor(i.creative, tl.todo.validate(last.number), "validate"),
    summary:
      L.approved !== null
        ? tl.summary.validated(L.approved)
        : last
          ? sentBack
            ? tl.summary.changes(last.number)
            : tl.summary.pending(last.number)
          : null,
  };
  const control: Def = {
    key: "control",
    prereq: ["post"],
    roles: [
      role("exec", i.producer, r.producer),
      role("coord", i.owner, r.owner),
    ],
    done: L.checkedAt !== null,
    act: () => actor(i.producer, tl.todo.control),
    summary: L.checkedAt ? tl.summary.checked : null,
  };
  const delivery: Def = {
    key: "delivery",
    prereq: ["control"],
    roles: [role("exec", i.owner, r.owner)],
    done: L.deliveredAt !== null || i.closed,
    act: () => actor(i.owner, tl.todo.deliver),
    summary: L.deliveredAt ? tl.summary.delivered : null,
  };
  return [whoProduces(i), versions, control, delivery];
}

function stepsOf(i: JourneyInput): Def[] {
  const ext = i.kind === "external";
  // Past the preparation, its steps count as passed.
  const passed =
    i.opened &&
    (i.readyAt !== null || !["to_prepare", "preproduction"].includes(i.phase));
  const prep = (done: boolean) => done || passed;
  const owner = i.owner;
  const producer = i.producer;
  const exec = ext ? i.company : producer;

  const call: Def = {
    key: "call",
    prereq: [ext ? "organisation" : "direction"],
    roles: [
      role("exec", owner, r.owner),
      role("coord", ext ? null : producer, r.producer),
    ],
    done: prep(callDone(i)),
    act: () =>
      actor(
        owner,
        i.mode === "call"
          ? i.call.count === 0
            ? t.todo.callPlan
            : !i.call.reported
              ? t.todo.callReport
              : t.todo.callProposals
          : i.mode === "import" && i.call.proposed + i.call.confirmed === 0
            ? t.todo.importPlan
            : t.todo.prepare,
      ),
    summary:
      i.call.heldOn && i.mode === "call"
        ? t.summary.callOf(
            formatShortDay(i.call.heldOn, { bare: true }),
            i.call.confirmed,
          )
        : i.call.confirmed > 0
          ? t.summary.tasks(i.call.confirmed)
          : null,
  };

  const q = i.quote;
  const quote: Def = {
    key: "quote",
    prereq: [ext ? "call" : "gear"],
    roles: [
      role("exec", exec, ext ? r.company : r.producer),
      role("coord", producer, r.producer),
      role("valid", i.validator, r.validator),
    ],
    done: prep(q.active !== null),
    act: () => {
      switch (q.status) {
        case "deposited":
          return actor(producer, t.todo.quoteCheck);
        case "submitted":
          return actor(
            i.validator,
            t.todo.quoteDecide(q.number ?? 1),
            "validate",
          );
        case "rejected":
        case "changes":
          return actor(exec, t.todo.quoteRedo);
        case "approved":
          return q.revision ? actor(exec, t.todo.quoteRedo) : null;
        default:
          return actor(
            exec,
            t.todo.quoteDeposit[ext ? "external" : "internal"],
          );
      }
    },
    summary: q.active
      ? t.summary.quote.approved(
          q.active.number,
          formatEuros(q.active.amountCents),
        )
      : q.status && q.status !== "replaced" && q.status !== "approved"
        ? t.summary.quote[q.status]
        : null,
  };

  const d = i.direction;
  const pr = i.proposal;
  const tp = fr.productionProposal;
  // External (PR-11): the director deposits versions; the internal creative
  // validation and, when named, the external one decide the latest.
  const externalAct = (): JourneyActor | null => {
    if (!i.director)
      return i.directorProposals > 0
        ? actor(owner, t.todo.directorRetain)
        : actor(i.company, t.todo.directionNobody);
    if (pr.depositOpen)
      return actor(
        i.director,
        pr.latest === null ? tp.todo.deposit : tp.todo.again,
      );
    if (pr.waitsInt && pr.latest !== null)
      return actor(i.creative, tp.todo.validate(pr.latest), "validate");
    if (pr.waitsExt && pr.latest !== null)
      return actor(i.creativeExt, tp.todo.validate(pr.latest), "validate");
    return null;
  };
  const direction: Def = {
    key: "direction",
    prereq: [ext ? "quote" : "organisation"],
    roles: [
      role("exec", i.director, r.director),
      role("coord", i.creative, r.creative),
      role("valid", i.creative, r.creativeInt),
      ext ? role("valid", i.creativeExt, r.creativeExt) : null,
    ],
    done: prep(
      ext
        ? pr.retained !== null || d.status === "approved"
        : d.status === "approved",
    ),
    act: () =>
      ext
        ? externalAct()
        : d.status === "submitted"
          ? actor(i.creative, t.todo.directionDecide, "validate")
          : i.director
            ? actor(
                i.director,
                d.status === "changes"
                  ? t.todo.directionChanges
                  : t.todo.directionWrite,
              )
            : actor(owner, t.todo.directionNobody),
    summary: ext
      ? pr.retained !== null
        ? tp.summary.retained(pr.retained)
        : pr.latest === null
          ? null
          : pr.depositOpen
            ? tp.summary.changes(pr.latest)
            : tp.summary.pending(pr.latest)
      : d.status === "draft"
        ? null
        : t.summary.direction[d.status],
  };

  const followUp: Def = {
    key: "follow-up",
    prereq: ["quote"],
    roles: [
      role("exec", i.company, r.company),
      role("coord", producer, r.producer),
    ],
    done: prep(i.checklist.total > 0 && i.checklist.done === i.checklist.total),
    act: () =>
      i.checklist.companyOpen > 0
        ? actor(i.company, t.todo.progressTasks(i.checklist.companyOpen))
        : actor(producer, t.todo.progress),
    summary:
      i.checklist.total > 0
        ? t.summary.progress(i.checklist.done, i.checklist.total)
        : null,
  };

  const gear: Def = {
    key: "gear",
    prereq: ["call"],
    roles: [role("exec", producer, r.producer), role("coord", owner, r.owner)],
    done: prep(
      i.gear.lines > 0 &&
        i.gear.positions > 0 &&
        i.gear.filled >= i.gear.positions,
    ),
    act: () =>
      i.gear.lines === 0
        ? actor(i.dop ?? producer, t.todo.gearList)
        : actor(producer, t.todo.team),
    summary: i.gear.lines > 0 ? t.summary.gear(i.gear.lines) : null,
  };

  const proposer = ext ? i.company : producer;
  const locations: Def = {
    key: "locations",
    prereq: [ext ? "direction" : "call"],
    roles: [
      role("exec", proposer, ext ? r.company : r.producer),
      role("coord", producer, r.producer),
      role("valid", owner, r.owner),
    ],
    done: prep(i.locations.status === "confirmed"),
    act: () =>
      i.locations.candidates === 0
        ? actor(proposer, t.todo.locationsPropose)
        : actor(owner, t.todo.locationsChoose),
    summary:
      i.locations.status === "confirmed"
        ? i.locations.name
        : i.locations.candidates > 0
          ? t.summary.locations(i.locations.candidates)
          : null,
  };

  const callSheet: Def = {
    key: "call-sheet",
    prereq: ["locations", "quote"],
    roles: [role("exec", producer, r.producer), role("coord", owner, r.owner)],
    done: prep(i.callSheet.ready),
    act: () => actor(producer, t.todo.callSheet),
    summary: i.callSheet.published
      ? t.summary.callSheet(i.callSheet.published)
      : null,
  };

  const readiness: Def = {
    key: "readiness",
    prereq: ext ? ["quote", "direction", "locations"] : ["call-sheet"],
    roles: [role("exec", owner, r.owner), role("coord", producer, r.producer)],
    done: passed,
    // A derogation asked waits for the quote validator (MKT-PROD-002).
    act: () =>
      i.readyRequested
        ? actor(i.validator, t.todo.readyDecide, "validate")
        : actor(owner, i.readyReopened ? t.todo.readyAgain : t.todo.ready),
    summary: i.readyAt ? t.summary.ready : null,
  };

  const shot = i.shotAt !== null || SHOT.includes(i.phase);
  const shoot: Def = {
    key: "shoot",
    prereq: ["readiness"],
    roles: [
      role("exec", exec, ext ? r.company : r.producer),
      role("coord", producer, r.producer),
      role("valid", owner, r.owner),
    ],
    done: shot,
    // An external company's shoot is confirmed by the owner, unless a
    // participation contract blocks it (lot 12 bis): then what to do.
    act: () =>
      ext && !i.contractBlocked ? actor(owner, t.todo.shootDone) : i.later,
    summary: shot ? t.summary.shot : null,
  };

  const rushes: Def = {
    key: "rushes",
    prereq: ["shoot"],
    roles: [
      role("exec", i.company, r.company),
      role("coord", producer, r.producer),
    ],
    done: (i.rushes.received && i.rushes.backup) || POSTED.includes(i.phase),
    act: () =>
      !i.rushes.linked
        ? actor(i.company, t.todo.rushesLink)
        : !i.rushes.received
          ? actor(producer, t.todo.rushesReceived)
          : actor(producer, t.todo.rushesBackup),
    summary: i.rushes.received && i.rushes.backup ? t.summary.rushes : null,
  };

  // External (PR-12): the company deposits each version on its link, the
  // internal then, when named, the external creative validation review it;
  // the company deposits the final file, PDS checks then delivers.
  const L = i.light;
  const tc = fr.productionCut;
  const cut = L.latest;
  const cutBack =
    cut?.status === "changes_requested" || cut?.status === "refused";
  const post: Def = {
    key: "post",
    prereq: [ext ? "rushes" : "shoot"],
    roles: [
      role("exec", exec, ext ? r.post : r.producer),
      role("coord", i.creative, r.creative),
      role("valid", i.creative, r.creativeInt),
      ext ? role("valid", i.creativeExt, r.creativeExt) : null,
    ],
    done: POSTED.includes(i.phase),
    act: () =>
      !ext
        ? i.later
        : !cut || cutBack
          ? actor(i.company, tc.todo.deposit((cut?.number ?? 0) + 1))
          : cut.status === "approved"
            ? null
            : !cut.intApproved
              ? actor(i.creative, tc.todo.review(cut.number), "validate")
              : cut.ext === "pending"
                ? actor(i.creativeExt, tc.todo.review(cut.number), "validate")
                : null,
    summary: null,
  };

  const delivery: Def = {
    key: "delivery",
    prereq: ["post"],
    roles: [
      role("exec", exec, ext ? r.post : r.producer),
      role("coord", owner, r.owner),
      role("valid", owner, r.owner),
    ],
    done: i.closed,
    act: () =>
      !ext || !L.approvedAt
        ? i.later
        : !L.finalUrl
          ? actor(i.company, tc.todo.final)
          : !L.checkedAt
            ? actor(producer, fr.productionLight.todo.control)
            : !L.deliveredAt
              ? actor(owner, tc.todo.deliver)
              : i.later,
    summary: null,
  };

  return ext
    ? [
        whoProduces(i),
        call,
        quote,
        direction,
        followUp,
        locations,
        readiness,
        shoot,
        rushes,
        post,
        delivery,
      ]
    : [
        whoProduces(i),
        direction,
        call,
        gear,
        locations,
        quote,
        callSheet,
        readiness,
        shoot,
        post,
        delivery,
      ];
}

// The preparation is decided once PO's points (or the call's) are all
// settled and at least one became a task.
function callDone(i: JourneyInput): boolean {
  const settled = i.call.proposed === 0 && i.call.confirmed > 0;
  return i.mode === "call" ? i.call.reported && settled : settled;
}

export function titleOf(
  key: StepKey,
  i: Pick<JourneyInput, "kind" | "mode" | "track">,
): string {
  const internal = i.kind === "internal";
  const v = t.variants;
  const tl = fr.productionLight.steps;
  if (i.track !== "shoot")
    switch (key) {
      case "post":
        return i.track === "artwork" ? tl.versions.cover : tl.versions.title;
      case "control":
        return tl.control.title;
      case "delivery":
        return tl.delivery.title;
    }
  switch (key) {
    case "call":
      return v.call[i.mode];
    case "direction":
      return internal ? v.internal.direction.title : t.steps.direction.title;
    case "quote":
      return internal ? v.internal.quote.title : t.steps.quote.title;
    case "post":
      return internal ? v.internal.post.title : t.steps.post.title;
    default:
      return t.steps[key].title;
  }
}

function whyOf(key: StepKey, i: JourneyInput): string {
  const v = t.variants.internal;
  const tl = fr.productionLight.steps;
  if (i.track !== "shoot")
    switch (key) {
      case "post":
        return tl.versions.why;
      case "control":
        return tl.control.why;
      case "delivery":
        return tl.delivery.why;
    }
  if (i.kind !== "internal") return t.steps[key].why;
  switch (key) {
    case "call":
      return v.call;
    case "direction":
      return v.direction.why;
    case "quote":
      return v.quote.why;
    case "shoot":
      return v.shoot;
    case "post":
      return v.post.why;
    default:
      return t.steps[key].why;
  }
}

/** Where the viewer lands on the deliverable: their first own step, else
 * the first open one, else the last done. */
export function landingStep(steps: JourneyStep[]): StepKey {
  const { mine } = nowOf(steps);
  return (
    mine[0]?.key ??
    steps.find((s) => s.status === "current" || s.status === "rework")?.key ??
    steps.filter((s) => s.status === "done").at(-1)?.key ??
    "organisation"
  );
}
