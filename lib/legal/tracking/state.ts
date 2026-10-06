// The Suivi of a launched plan (ticket Juridique 07): where each action
// really stands, read from its source objects at each visit (« Une Rule lit
// les objets sources, jamais une copie UI »), never stored, never decided by
// the model. Recomputing has no effect, so reading twice cannot duplicate
// anything. Pure.
//
// Groups of the ticket: « À traiter maintenant, En attente externe,
// Incident / décision requise et Progression silencieuse ». « Un
// formulaire envoyé ou un contrat en signature quitte la todo humaine et
// devient une attente surveillée. »

import type { InventoryRows } from "@/lib/legal/inventory-rows";
import type { PlanItemStatus } from "@/lib/legal/plan/proposal";
import type { PlanRow } from "@/lib/legal/plan/queries";
import type { SplitState } from "@/lib/legal/splits/queries";
import {
  itemSource,
  sourceContext,
  type TrackClearance,
} from "@/lib/legal/tracking/sources";

export type { TrackClearance } from "@/lib/legal/tracking/sources";

export const TRACK_GROUPS = ["now", "decision", "waiting", "silent"] as const;
export type TrackGroup = (typeof TRACK_GROUPS)[number];

export type TrackedItem = PlanRow & {
  // The stored item's id (delegation writes on it).
  id: string;
  // Recomputed from the sources (ticket 07's item states).
  current: PlanItemStatus;
  group: TrackGroup;
  // Why it stands there, in words.
  reason: string;
  // Since when it waits (the source's last change), when it waits.
  since: string | null;
  overdue: boolean;
  // Where it is done.
  sourceHref: string | null;
};

export function trackPlan(input: {
  projectId: string;
  items: Array<PlanRow & { id: string }>;
  rows: InventoryRows;
  clearances: TrackClearance[];
  today: string;
  completeContacts: Set<string>;
  splitOf: Map<string, SplitState>;
}): TrackedItem[] {
  const ctx = sourceContext(input);
  const sourceOf = (item: PlanRow, depsDone: boolean) =>
    itemSource(item, depsDone, ctx);

  // Dependencies first: an action is free once all it waits for is done or
  // no longer needed (« débloquée indépendamment »). Plans are small.
  const result = new Map<string, TrackedItem>();
  const resolve = (
    item: PlanRow & { id: string },
    seen = new Set<string>(),
  ): TrackedItem => {
    const known = result.get(item.key);
    if (known) return known;
    seen.add(item.key);
    const depsDone = item.dependsOn.every((key) => {
      const dep = input.items.find((i) => i.key === key);
      if (!dep || seen.has(key)) return true;
      const state = resolve(dep, seen).current;
      return state === "done" || state === "obsolete";
    });
    const source = sourceOf(item, depsDone);
    const finished = source.status === "done" || source.status === "obsolete";
    const overdue =
      !finished && item.dueOn !== null && item.dueOn < input.today;
    const tracked: TrackedItem = {
      ...item,
      current: source.status,
      group:
        source.decision || overdue
          ? "decision"
          : source.status === "action_now"
            ? "now"
            : source.status === "waiting_external"
              ? "waiting"
              : "silent",
      reason: source.reason,
      since: source.since ?? null,
      overdue,
      sourceHref: source.href,
    };
    result.set(item.key, tracked);
    return tracked;
  };
  return input.items.map((item) => resolve(item));
}
