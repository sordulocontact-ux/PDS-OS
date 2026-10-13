// The next action and the blockers of the Conception's journey (MKT-C2-03):
// the first incomplete thing, in the order of the journey, with where it
// opens shown before the click. Client-safe, pure (lib/design/journey.ts).

import { routes } from "@/lib/auth/redirects";
import { DESIGN_TOPICS } from "@/lib/design/intentions";
import type {
  JourneyInput,
  JourneyLink,
  JourneyNext,
} from "@/lib/design/journey";
import type { SheetStatus } from "@/lib/design/states";
import { fr } from "@/lib/i18n/fr";

const ALL = DESIGN_TOPICS.length;

export function nextOf(input: JourneyInput, developDone: boolean): JourneyNext {
  const t = fr.conceptionJourney;
  const a = t.actions;
  const w = t.places;
  const p = input.projectId;
  const link = (label: string, href: string, place: string) => ({
    kind: "action" as const,
    action: { label, href, place },
  });
  if (!input.canWrite && !input.isOwner) return { kind: "read_only" };
  if (!input.started)
    return input.isOwner
      ? link(a.prepareExchange, routes.projectDesign(p), w.home)
      : { kind: "read_only" };

  const locked =
    input.stageState === "awaiting_validation" ||
    input.stageState === "validated";
  if (!locked) {
    if (input.proposals > 0) {
      // The first target with proposals waiting: the direction, else a
      // deliverable; PO's unassigned ones open the work as it is.
      const target =
        input.direction.proposals > 0
          ? { key: "direction", title: w.directionTarget }
          : (() => {
              const d = input.deliverables.find((x) => x.proposals > 0);
              return d ? { key: d.id, title: d.title } : null;
            })();
      return link(
        a.reviewProposals(input.proposals),
        routes.projectDesignWork(p, target?.key),
        target ? w.work(target.title) : t.places.workAll,
      );
    }
    const dir = input.direction;
    if (!dir.hasResponsible && input.isOwner)
      return link(
        a.assignDirection,
        routes.projectDesignDirection(p),
        w.direction,
      );
    if (dir.state === "changes_requested" || dir.state === "rejected")
      return link(
        a.reviseDirection,
        routes.projectDesignDirection(p),
        w.direction,
      );
    if (
      dir.answered < ALL &&
      dir.state !== "pending" &&
      dir.state !== "approved"
    )
      return link(
        a.answerDirection,
        routes.projectDesignWork(p, "direction"),
        w.work(w.directionTarget),
      );
    if (dir.state === "ready" && dir.canSubmit)
      return link(
        a.submitDirection,
        routes.projectDesignDirection(p),
        w.direction,
      );

    for (const d of input.deliverables) {
      if (!d.sheet) {
        if (d.answered < ALL)
          return link(
            a.answerDeliverable(d.title),
            routes.projectDesignWork(p, d.id),
            w.work(d.title),
          );
        if (input.isOwner)
          return link(
            a.createSheet(d.title),
            routes.projectDesignSheets(p),
            w.sheets,
          );
        continue;
      }
      const href = routes.projectDesignSheet(p, d.sheet.id);
      if (["draft", "to_complete", "rejected"].includes(d.sheet.status))
        return link(a.completeSheet(d.title), href, w.sheet(d.title));
      if (d.sheet.status === "ready")
        return link(a.submitSheet(d.title), href, w.sheet(d.title));
    }

    if (developDone && input.isOwner) {
      if (input.brief.latest === null)
        return link(a.createBrief, routes.projectDesignBrief(p), w.brief);
      if (!input.brief.upToDate)
        return link(
          a.updateBrief(input.brief.latest + 1),
          routes.projectDesignBrief(p),
          w.brief,
        );
      return link(
        a.requestValidation,
        `${routes.projectDesign(p)}#conception-validation`,
        w.validation,
      );
    }
  }

  if (input.stageState === "validated" && input.isOwner) {
    const next = input.deliverables.find(
      (d) => d.sheet?.status === "ready_for_production",
    );
    if (next?.sheet)
      return link(
        a.transfer(next.title),
        routes.projectDesignSheet(p, next.sheet.id),
        w.sheet(next.title),
      );
    return link(a.openProduction, routes.projectProduction(p), w.production);
  }

  const waiting =
    input.stageState === "awaiting_validation"
      ? t.waitingFor.validation
      : input.direction.state === "pending"
        ? t.waitingFor.direction
        : (() => {
            const d = input.deliverables.find(
              (x) => x.sheet?.status === "pending",
            );
            return d ? t.waitingFor.sheet(d.title) : null;
          })();
  return { kind: "waiting", what: waiting };
}

export function blockersOf(input: JourneyInput): JourneyLink[] {
  if (!input.started) return [];
  const b = fr.conceptionJourney.blockers;
  const w = fr.conceptionJourney.places;
  const p = input.projectId;
  const list: JourneyLink[] = [];
  const add = (label: string, href: string, place: string) =>
    list.push({ label, href, place });
  if (input.proposals > 0)
    add(
      b.proposals(input.proposals),
      routes.projectDesignWork(p),
      w.work(w.directionTarget),
    );
  if (!input.direction.hasResponsible)
    add(b.directionResponsible, routes.projectDesignDirection(p), w.direction);
  if (input.direction.state === "changes_requested")
    add(b.directionChanges, routes.projectDesignDirection(p), w.direction);
  if (input.direction.state === "rejected")
    add(b.directionRejected, routes.projectDesignDirection(p), w.direction);
  for (const d of input.deliverables)
    if (d.sheet?.status === "rejected")
      add(
        b.sheetChanges(d.title),
        routes.projectDesignSheet(p, d.sheet.id),
        w.sheet(d.title),
      );
  const noSheet = input.deliverables.filter((d) => !d.sheet).length;
  if (noSheet > 0)
    add(b.noSheet(noSheet), routes.projectDesignSheets(p), w.sheets);
  if (input.unattachedReferences > 0)
    add(
      b.references(input.unattachedReferences),
      routes.projectDesignReferences(p),
      fr.conception.tabs.references,
    );
  if (input.toQualify > 0)
    add(b.toQualify(input.toQualify), routes.projectDesign(p), w.home);
  if (input.brief.latest !== null && !input.brief.upToDate)
    add(b.briefOutdated, routes.projectDesignBrief(p), w.brief);
  return list;
}

/**
 * One deliverable's next step on the Conception's home (MKT-C2-07): its
 * gaps and what to do next, in the order of the journey. Computed by code.
 */
export function deliverableNext(
  d: { status: string; answered: number; inherited: number },
  sheet: { status: SheetStatus; blockers: number } | null,
): string {
  const n = fr.conceptionJourney.deliverableNext;
  if (d.status === "to_qualify") return n.qualify;
  if (d.answered + d.inherited < ALL)
    return n.questions(ALL - d.answered - d.inherited);
  if (!sheet) return n.createSheet;
  switch (sheet.status) {
    case "draft":
    case "to_complete":
      return n.completeSheet(sheet.blockers);
    case "rejected":
      return n.rework;
    case "ready":
      return n.submit;
    case "pending":
      return n.waiting;
    case "ready_for_production":
      return n.transfer;
    case "transferred":
      return n.inProduction;
  }
}
