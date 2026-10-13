import "server-only";

import type { RetainedIntention } from "@/components/design/work/consolidation-panel";
import type { ConceptionData } from "@/lib/design/conception";
import { DIRECTION_KEY } from "@/lib/design/intentions";
import { intentionsState, type IntentionsState } from "@/lib/design/states";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

/** The latest consolidation the owner confirmed for a target. */
export type IntentConfirmation = {
  snapshot: Array<{ intention_id: string }>;
  confirmedBy: string | null;
  confirmedAt: string;
};

export type Consolidation = {
  // Per target key: a deliverable id, or « direction ».
  confirmations: Record<string, IntentConfirmation>;
  states: Record<string, IntentionsState>;
  // Every confirmation of the release's direction, newest first (MKT-C2-06:
  // its revision history).
  directionHistory: IntentConfirmation[];
};

function snapshotOf(value: unknown): Array<{ intention_id: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item: unknown) =>
    item &&
    typeof item === "object" &&
    "intention_id" in item &&
    typeof item.intention_id === "string"
      ? [{ intention_id: item.intention_id }]
      : [],
  );
}

/**
 * Where each target's intentions stand (ticket § 4): Brouillon, À
 * confirmer, Confirmées, À réviser — computed by code from the retained
 * answers, PO's proposals and the owner's latest confirmation.
 */
export async function loadConsolidation(
  projectId: string,
  data: Pick<ConceptionData, "deliverables" | "intentions">,
): Promise<Consolidation> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("design_intent_confirmations")
    .select("design_deliverable_id, snapshot, confirmed_by, confirmed_at")
    .eq("project_id", projectId)
    .order("confirmed_at", { ascending: false });

  const confirmations: Record<string, IntentConfirmation> = {};
  const directionHistory: IntentConfirmation[] = [];
  for (const row of rows ?? []) {
    if (!row.design_deliverable_id)
      directionHistory.push({
        snapshot: snapshotOf(row.snapshot),
        confirmedBy: row.confirmed_by,
        confirmedAt: row.confirmed_at,
      });
    const key = row.design_deliverable_id ?? DIRECTION_KEY;
    // Newest first: the first one met is the one in force.
    confirmations[key] ??= {
      snapshot: snapshotOf(row.snapshot),
      confirmedBy: row.confirmed_by,
      confirmedAt: row.confirmed_at,
    };
  }

  const keys = [DIRECTION_KEY, ...data.deliverables.map((d) => d.id)];
  const states = Object.fromEntries(
    keys.map((key) => {
      const own = data.intentions.filter((i) =>
        key === DIRECTION_KEY
          ? i.target === "direction"
          : i.target === "deliverable" && i.deliverableId === key,
      );
      return [
        key,
        intentionsState({
          answers: own.filter((i) => i.status === "confirmed"),
          proposals: own.filter((i) => i.status === "proposed").length,
          confirmation: confirmations[key] ?? null,
        }),
      ];
    }),
  );
  return { confirmations, states, directionHistory };
}

/**
 * What the consolidation panel of one target shows: its state, the retained
 * intentions with their provenance, PO's proposals still waiting, and who
 * confirmed last. `target`: a deliverable id, or « direction ».
 */
export function consolidationPanelData(
  data: Pick<ConceptionData, "intentions" | "sources">,
  consolidation: Consolidation,
  members: Member[],
  target: string,
): {
  target: string;
  state: IntentionsState;
  retained: RetainedIntention[];
  proposals: number;
  confirmation: { byName: string; at: string } | null;
} {
  const isDirection = target === DIRECTION_KEY;
  const own = data.intentions.filter((i) =>
    isDirection
      ? i.target === "direction"
      : i.target === "deliverable" && i.deliverableId === target,
  );
  const topics = isDirection
    ? fr.conception.directionTopics
    : fr.conception.topics;
  const sourceLabel = (sourceId: string | null) => {
    const source = data.sources.find((x) => x.id === sourceId);
    if (!source) return fr.conceptionIntents.consolidation.manualSource;
    return source.kind === "call"
      ? fr.conception.originDetails.call(source.title)
      : fr.conceptionWork.proposals.fromImport(source.title);
  };
  const confirmation = consolidation.confirmations[target] ?? null;
  return {
    target,
    state: consolidation.states[target] ?? "draft",
    retained: own
      .filter((i) => i.status === "confirmed")
      .map((i) => ({
        id: i.id,
        topicLabel: topics[i.topic],
        value: i.value,
        sourceLabel: sourceLabel(i.sourceId),
      })),
    proposals: own.filter((i) => i.status === "proposed").length,
    confirmation: confirmation
      ? {
          byName:
            members.find((m) => m.personId === confirmation.confirmedBy)
              ?.name ?? "",
          at: confirmation.confirmedAt,
        }
      : null,
  };
}
