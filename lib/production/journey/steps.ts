// The steps of each organisation (Ibé, 14/10), their state and who acts now.
// Pure, client-safe; every state comes from recorded data, never from PO.

import { fr } from "@/lib/i18n/fr";
import { nowOf } from "@/lib/ui/journey";

import { stepHref } from "./href";

import type {
  JourneyActor,
  JourneyInput,
  JourneyPerson,
  JourneyStep,
  StepKey,
} from "./types";

const t = fr.productionJourney;

type Def = {
  key: StepKey;
  prereq: StepKey[];
  owner: JourneyPerson | null;
  ownerRole: string;
  validator?: { person: JourneyPerson; role: string } | null;
  done: boolean;
  // Who acts now when the step is open.
  act: (() => JourneyActor | null) | null;
  summary: string | null;
};

const actor = (p: JourneyPerson | null, todo: string): JourneyActor | null =>
  p ? { ...p, todo } : null;

const SHOT = ["shot", "post", "final_check", "delivered", "handed_off"];
const POSTED = ["final_check", "delivered", "handed_off"];

export function journeySteps(input: JourneyInput): JourneyStep[] {
  const i = input;
  const ext = i.kind === "external";
  const kind = ext ? "external" : "internal";
  // Past the preparation, its steps count as passed.
  const passed =
    i.opened &&
    (i.readyAt !== null || !["to_prepare", "preproduction"].includes(i.phase));
  const prep = (done: boolean) => done || (i.opened && passed);

  const organisation: Def = {
    key: "organisation",
    prereq: [],
    owner: i.owner,
    ownerRole: t.roles.owner,
    done: i.opened && i.kind !== null,
    act: () => actor(i.owner, t.todo.organize),
    summary: i.kind
      ? ext
        ? t.summary.organization.external(i.company?.name ?? "—")
        : t.summary.organization.internal
      : null,
  };
  const callOwner = ext ? i.owner : i.producer;
  const call: Def = {
    key: "call",
    prereq: [ext ? "organisation" : "direction"],
    owner: callOwner,
    ownerRole: ext ? t.roles.owner : i.producerRole,
    done: prep(i.call.reported && i.call.proposed === 0),
    act: () =>
      actor(
        callOwner,
        i.call.count === 0
          ? t.todo.callPlan
          : !i.call.reported
            ? t.todo.callReport
            : t.todo.callProposals,
      ),
    summary: i.call.reported ? t.summary.calls(i.call.planned) : null,
  };
  const depositor = ext ? i.company : i.producer;
  const quote: Def = {
    key: "quote",
    prereq: [ext ? "call" : "gear"],
    owner: i.producer,
    ownerRole: i.producerRole,
    validator: i.validator
      ? { person: i.validator, role: t.roles.validator }
      : null,
    done: prep(i.quote.approved > 0),
    act: () => {
      switch (i.quote.status) {
        case "deposited":
          return actor(i.producer, t.todo.quoteCheck);
        case "submitted":
          return actor(i.validator, t.todo.quoteDecide);
        case "rejected":
          return actor(depositor, t.todo.quoteRedo);
        default:
          return actor(depositor, t.todo.quoteDeposit[kind]);
      }
    },
    summary:
      i.quote.approved > 0
        ? t.summary.quote.approved
        : i.quote.status
          ? t.summary.quote[i.quote.status]
          : null,
  };
  const d = i.direction;
  const direction: Def = {
    key: "direction",
    prereq: [ext ? "quote" : "organisation"],
    owner: i.director,
    ownerRole: t.roles.director,
    validator: { person: i.creative, role: t.roles.creative },
    done: prep(d.status === "approved"),
    act: () =>
      d.status === "submitted"
        ? actor(i.creative, t.todo.directionDecide)
        : i.director
          ? actor(
              i.director,
              d.status === "changes"
                ? t.todo.directionChanges
                : t.todo.directionWrite,
            )
          : actor(i.owner, t.todo.directionNobody),
    summary: d.status === "draft" ? null : t.summary.direction[d.status],
  };
  const followUp: Def = {
    key: "follow-up",
    prereq: ["direction"],
    owner: i.company,
    ownerRole: t.roles.company,
    done: prep(i.progress === 4),
    act: () => actor(i.company, t.todo.progress),
    summary: t.summary.progress(i.progress),
  };
  const gear: Def = {
    key: "gear",
    prereq: ["call"],
    owner: i.producer,
    ownerRole: i.producerRole,
    done: prep(
      i.gear.lines > 0 &&
        i.gear.positions > 0 &&
        i.gear.filled >= i.gear.positions,
    ),
    act: () =>
      i.gear.lines === 0
        ? actor(i.dop ?? i.producer, t.todo.gearList)
        : actor(i.producer, t.todo.team),
    summary: i.gear.lines > 0 ? t.summary.gear(i.gear.lines) : null,
  };
  const proposer = ext ? i.company : i.producer;
  const locations: Def = {
    key: "locations",
    prereq: [ext ? "direction" : "call"],
    owner: proposer,
    ownerRole: ext ? t.roles.company : i.producerRole,
    validator: { person: i.owner, role: t.roles.owner },
    done: prep(i.locations.status === "confirmed"),
    act: () =>
      i.locations.candidates === 0
        ? actor(proposer, t.todo.locationsPropose)
        : actor(i.owner, t.todo.locationsChoose),
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
    owner: i.producer,
    ownerRole: i.producerRole,
    done: prep(i.callSheet.ready),
    act: () => actor(i.producer, t.todo.callSheet),
    summary: i.callSheet.published
      ? t.summary.callSheet(i.callSheet.published)
      : null,
  };
  const readiness: Def = {
    key: "readiness",
    prereq: ext ? ["follow-up", "locations"] : ["call-sheet"],
    owner: i.owner,
    ownerRole: t.roles.owner,
    done: passed,
    act: () => actor(i.owner, t.todo.ready),
    summary: i.readyAt ? t.summary.ready : null,
  };
  const later = (key: StepKey, prereq: StepKey, done: boolean): Def => ({
    key,
    prereq: [prereq],
    owner: null,
    ownerRole: "",
    done,
    act: () => i.later,
    summary: null,
  });

  const defs: Def[] = ext
    ? [organisation, call, quote, direction, followUp, locations, readiness]
    : [
        organisation,
        direction,
        call,
        gear,
        locations,
        quote,
        callSheet,
        readiness,
      ];
  defs.push(
    later("shoot", "readiness", SHOT.includes(i.phase)),
    later("post", "shoot", POSTED.includes(i.phase)),
    later("delivery", "post", i.closed),
  );

  const status = new Map<StepKey, JourneyStep["status"]>();
  return defs.map((def) => {
    const ready = def.prereq.every((p) => status.get(p) === "done");
    const st: JourneyStep["status"] = def.done
      ? "done"
      : ready
        ? "current"
        : // Preparation steps can be prepared ahead; the shoot cannot.
          ["shoot", "post", "delivery"].includes(def.key)
          ? "upcoming"
          : "blocked";
    status.set(def.key, st);
    return {
      key: def.key,
      href: stepHref(i.projectId, i.deliverableId, def.key),
      title: titleOf(def.key, i),
      why: whyOf(def.key, i),
      status: st,
      owner: def.owner ? { name: def.owner.name, role: def.ownerRole } : null,
      validator: def.validator
        ? { name: def.validator.person.name, role: def.validator.role }
        : null,
      prereq: def.prereq,
      next: defs.filter((x) => x.prereq.includes(def.key)).map((x) => x.key),
      actor: st === "current" && def.act ? def.act() : null,
      summary: def.summary,
    };
  });
}

export function titleOf(
  key: StepKey,
  i: Pick<JourneyInput, "kind" | "company">,
): string {
  const kind = i.kind === "external" ? "external" : "internal";
  const s = t.steps;
  switch (key) {
    case "call":
      return s.call.title[kind];
    case "quote":
      return s.quote.title[kind];
    case "follow-up":
      return s["follow-up"].title(i.company?.name ?? t.roles.company);
    default:
      return s[key].title;
  }
}

function whyOf(key: StepKey, i: JourneyInput): string {
  const kind = i.kind === "external" ? "external" : "internal";
  const s = t.steps;
  if (key === "call") return s.call.why[kind];
  if (key === "quote") return s.quote.why[kind];
  return s[key].why;
}

/** Where the viewer lands on the deliverable: their first own step, else
 * the first open one, else the last done. */
export function landingStep(steps: JourneyStep[]): StepKey {
  const { mine } = nowOf(steps);
  return (
    mine[0]?.key ??
    steps.find((s) => s.status === "current")?.key ??
    steps.filter((s) => s.status === "done").at(-1)?.key ??
    "organisation"
  );
}
