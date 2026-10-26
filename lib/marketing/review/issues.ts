// « Ce qui manque » before a version of the bilan (proto `bilanIssues`):
// one line per activation that is not « clean », and each objective of the
// Stratégie read after a date still to come. Computed here from the data,
// never by a model; ticked, they become the version's reserves.
// Pure, client-safe.

import { fr } from "@/lib/i18n/fr";
import type { ReserveCategory } from "@/lib/marketing/reports/model";
import { formatDay } from "@/lib/utils/day";

import type { ReviewActivation } from "./review-activation";

const t = fr.reviewJourney.issues;

export type BilanIssue = {
  // Stable across renders: the preparation keeps what was ticked.
  key: string;
  category: ReserveCategory;
  text: string;
  activationId: string | null;
  // An activation still open: always a reserve of the version, never left
  // out (recette of 23/10, MKT-BIL-001).
  locked: boolean;
};

export type HorizonObjective = {
  id: string;
  label: string;
  // The date its figure can be read (Stratégie, « Objectifs & KPIs »).
  dueOn: string | null;
};

/**
 * What is missing for the bilan: an activation cancelled (with its reason),
 * not yet closed (with its state), closed with a proof not verified or its
 * statistics unavailable; an
 * objective whose figure is read after today. `known`: descriptions of the
 * reserves already open, carried over by the version as they are.
 */
export function bilanIssues(
  activations: ReviewActivation[],
  objectives: HorizonObjective[],
  today: string,
  known: readonly string[] = [],
): BilanIssue[] {
  const issues: BilanIssue[] = [];
  for (const a of activations) {
    if (a.status === "cancelled")
      issues.push({
        key: `cancelled:${a.id}`,
        category: "activations",
        text: t.cancelled(a.title, a.reason),
        activationId: a.id,
        locked: false,
      });
    else if (a.status !== "closed")
      issues.push({
        key: `open:${a.id}`,
        category: "activations",
        text: t.notClosed(a.title, t.states[a.status]),
        activationId: a.id,
        locked: true,
      });
    else {
      if (a.proof !== "verified" && a.proof !== "not_expected")
        issues.push({
          key: `proof:${a.id}`,
          category: "evidence",
          text: t.proof(a.title),
          activationId: a.id,
          locked: false,
        });
      if (a.measure === "unavailable")
        issues.push({
          key: `stats:${a.id}`,
          category: "statistics",
          text: t.statsUnavailable(a.title),
          activationId: a.id,
          locked: false,
        });
    }
  }
  for (const o of objectives)
    if (o.dueOn && o.dueOn > today)
      issues.push({
        key: `horizon:${o.id}`,
        category: "statistics",
        text: t.horizon(o.label, formatDay(o.dueOn)),
        activationId: null,
        locked: false,
      });
  return issues.filter((i) => !known.includes(i.text));
}
