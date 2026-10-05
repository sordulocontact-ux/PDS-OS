// The tiles of a workflow's first step as filters (État du master): a tile
// shows only the facts of its status, in every section; clicking the active
// tile shows everything again. The status lives in the URL (`?state=`).

import { FACT_STATUSES, type FactStatus } from "@/lib/facts/types";
import { viewHref } from "@/lib/ui/view-href";

export function asFactStatus(value: unknown): FactStatus | null {
  return FACT_STATUSES.find((status) => status === value) ?? null;
}

/** Each section with only the facts of `state` (all of them without it). */
export function filterFactSections<
  S extends { facts: Array<{ status: FactStatus }> },
>(sections: S[], state: FactStatus | null): S[] {
  if (!state) return sections;
  return sections.map((section) => ({
    ...section,
    facts: section.facts.filter((fact) => fact.status === state),
  }));
}

/** The three tiles, each a link to its filter (or back to all). */
export function factTiles(
  counts: Record<FactStatus, number>,
  labels: Record<FactStatus, string>,
  basePath: string,
  state: FactStatus | null,
) {
  return FACT_STATUSES.map((status) => ({
    label: labels[status],
    value: String(counts[status]),
    href: viewHref(basePath, { state: status === state ? null : status }),
    view: { current: status === state },
  }));
}
