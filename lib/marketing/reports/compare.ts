// Comparing two versions of a report (ticket « Suivi & bilan », critère
// d'acceptation: « Une nouvelle version peut être générée et comparée à la
// précédente »): each figure before → after, the activations, evidence and
// reserves that came in or went out. Both read from their own snapshot.
// Pure, client-safe.

import {
  FIGURE_KEYS,
  type Dashboard,
  type FigureKey,
} from "@/lib/marketing/dashboard";
import type { ReportSnapshot } from "@/lib/marketing/reports/model";

export type FigureChange = {
  key: FigureKey;
  before: number | null;
  after: number | null;
};

export type ReportComparison = {
  figures: FigureChange[];
  activationsAdded: string[];
  activationsRemoved: string[];
  evidenceAdded: number;
  evidenceRemoved: number;
  // Same evidence, a different level (declared → verified…).
  evidenceChanged: number;
  reservesAdded: string[];
  reservesRemoved: string[];
};

export function compareReports(
  before: { snapshot: ReportSnapshot; figures: Dashboard },
  after: { snapshot: ReportSnapshot; figures: Dashboard },
): ReportComparison {
  const ids = (list: { id: string }[]) => new Set(list.map((x) => x.id));
  const aIds = ids(before.snapshot.activations);
  const bIds = ids(after.snapshot.activations);
  const aEv = new Map(before.snapshot.evidence.map((e) => [e.id, e]));
  const bEv = new Map(after.snapshot.evidence.map((e) => [e.id, e]));
  const aRes = ids(before.snapshot.reserves);
  const bRes = ids(after.snapshot.reserves);
  return {
    figures: FIGURE_KEYS.map((key) => ({
      key,
      before: before.figures.figures[key].value,
      after: after.figures.figures[key].value,
    })).filter((f) => f.before !== f.after),
    activationsAdded: after.snapshot.activations
      .filter((a) => !aIds.has(a.id))
      .map((a) => a.title),
    activationsRemoved: before.snapshot.activations
      .filter((a) => !bIds.has(a.id))
      .map((a) => a.title),
    evidenceAdded: [...bEv.keys()].filter((id) => !aEv.has(id)).length,
    evidenceRemoved: [...aEv.keys()].filter((id) => !bEv.has(id)).length,
    evidenceChanged: [...bEv.entries()].filter(([id, e]) => {
      const old = aEv.get(id);
      return (
        old !== undefined &&
        (old.verification !== e.verification ||
          old.value !== e.value ||
          old.url !== e.url ||
          old.availability !== e.availability)
      );
    }).length,
    reservesAdded: after.snapshot.reserves
      .filter((r) => !aRes.has(r.id))
      .map((r) => r.description),
    reservesRemoved: before.snapshot.reserves
      .filter((r) => !bRes.has(r.id))
      .map((r) => r.description),
  };
}
