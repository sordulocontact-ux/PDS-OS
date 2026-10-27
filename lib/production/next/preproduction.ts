// The next action while the shoot is prepared: the director's brief, the
// technical call, then the work behind each check before the shoot, in the
// readiness order; a check whose work exists is confirmed by a person.
// Client-safe.

import { productionNext } from "@/lib/i18n/fr/production-next";
import { productionPreprod } from "@/lib/i18n/fr/production-preprod";
import type { ScheduleStep } from "@/lib/production/preprod/schedule";
import type { CheckKey } from "@/lib/production/preprod/types";

import { blank, type NextContext, type Place } from "./context";
import type { ProductionNext } from "./types";

const fr = { productionPreprod, productionNext };

const t = fr.productionNext;
const checkLabel = (key: CheckKey) =>
  fr.productionPreprod.readiness.checks[key];

// Where each check's work is done ("" = the Préparation tab).
const CHECK_PLACES: Record<
  CheckKey,
  { step: string; anchor: string; place: Place; due: ScheduleStep }
> = {
  location: {
    step: "preproduction",
    anchor: "location",
    place: "location",
    due: "location",
  },
  team: { step: "", anchor: "production-needs", place: "needs", due: "team" },
  equipment: {
    step: "preproduction",
    anchor: "equipment",
    place: "equipment",
    due: "rental",
  },
  schedule: {
    step: "preproduction",
    anchor: "schedule",
    place: "schedule",
    due: "brief",
  },
  budget: {
    step: "preproduction",
    anchor: "preprod-budget",
    place: "budget",
    due: "estimates",
  },
  call_sheet: {
    step: "preproduction",
    anchor: "call-sheet",
    place: "callSheet",
    due: "call_sheet",
  },
  permits: {
    step: "preproduction",
    anchor: "readiness",
    place: "readiness",
    due: "call_sheet",
  },
  backup: {
    step: "preproduction",
    anchor: "readiness",
    place: "readiness",
    due: "call_sheet",
  },
};

export function preproductionNext(ctx: NextContext): ProductionNext {
  const { input, link, by, owner } = ctx;
  const sheet = input.sheet;
  const p = input.preprod;
  const technicalCall = () =>
    owner({
      ...blank,
      kind: "act",
      dueKey: "estimates",
      title: t.steps.technicalCall.title,
      why: t.steps.technicalCall.why,
      link: link(
        t.steps.technicalCall.link,
        "preproduction",
        "technical-call",
        "technicalCall",
      ),
    });

  if (sheet && !sheet.briefWritten) {
    // A director who is a member writes the brief; otherwise the owner
    // writes it with what the director sent.
    const step = {
      ...blank,
      kind: "act" as const,
      dueKey: "brief" as const,
      title: t.steps.brief.title,
      why: t.steps.brief.why,
      link: link(t.steps.brief.link, "", "production-brief", "brief"),
    };
    const director = sheet.director;
    return director?.isMember
      ? by(
          director,
          "director",
          director.isViewer || input.owner.isViewer,
          step,
        )
      : owner(step);
  }
  if (!p || (!p.hasTechnicalCall && p.equipmentCount === 0))
    return technicalCall();

  const callLink = (label: string) =>
    link(label, "preproduction", "technical-call", "technicalCall");
  if (p.callProposals > 0)
    return owner({
      ...blank,
      kind: "decision",
      title: t.steps.callProposals.title(p.callProposals),
      why: t.steps.callProposals.why,
      link: callLink(t.steps.callProposals.link),
    });
  if (p.unplannedActions > 0)
    return owner({
      ...blank,
      kind: "act",
      dueKey: "estimates",
      title: t.steps.callActions.title(p.unplannedActions),
      why: t.steps.callActions.why,
      link: callLink(t.steps.callActions.link),
    });

  const planLink = (label: string) =>
    link(label, "preproduction", "plan", "plan");
  if (p.planActions === 0)
    return owner({
      ...blank,
      kind: "act",
      dueKey: "brief",
      title: t.steps.proposePlan.title,
      why: t.steps.proposePlan.why,
      link: planLink(t.steps.proposePlan.link),
    });
  if (p.draftActions > 0)
    return owner({
      ...blank,
      kind: "decision",
      title: t.steps.approvePlan.title(p.draftActions),
      why: t.steps.approvePlan.why,
      link: planLink(t.steps.approvePlan.link),
    });

  const open = p.checks.filter((c) => c.state === "open");
  const missing = open.map((c) => t.missing.check(checkLabel(c.key)));
  const readiness = (label: string) =>
    link(label, "preproduction", "readiness", "readiness");
  const first = open[0];
  if (!first)
    return owner({
      ...blank,
      kind: "decision",
      dueKey: "call_sheet",
      title: t.steps.markReady.title,
      why: t.steps.markReady.why,
      link: readiness(t.steps.markReady.link),
    });
  if (first.workDone)
    return owner({
      ...blank,
      kind: "decision",
      dueKey: CHECK_PLACES[first.key].due,
      title: t.steps.confirmCheck.title(checkLabel(first.key)),
      why: t.steps.confirmCheck.why,
      missing: missing.slice(1),
      link: readiness(t.steps.confirmCheck.link),
    });

  const work = t.steps.work[first.key];
  const where = CHECK_PLACES[first.key];
  const { positions, filled, toConfirm } = p.staffing;
  const teamMissing =
    first.key !== "team"
      ? []
      : positions === 0
        ? [t.missing.noNeeds]
        : [
            ...(positions > filled
              ? [t.missing.positions(positions - filled)]
              : []),
            ...(toConfirm > 0 ? [t.missing.availability(toConfirm)] : []),
          ];
  return owner({
    ...blank,
    kind: "act",
    dueKey: where.due,
    title: work.title,
    why: work.why,
    missing: [...teamMissing, ...missing.slice(1)],
    link: link(work.link, where.step, where.anchor, where.place),
  });
}
