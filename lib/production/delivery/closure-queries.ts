import "server-only";

import { createClient } from "@/lib/supabase/server";

// Equipment still out: rented or lent, not back (close_production_sheet).
const OUT = ["booked", "picked_up", "on_site", "to_return"];

export type ClosureFacts = {
  // Rented or lent equipment not returned, incidents blocking the closing.
  equipmentOut: number;
  blockingIncidents: number;
  // Whom the deliverable is entrusted to: the transmission's default
  // person in charge of Activations.
  assigneePersonId: string | null;
  // The activation made from this deliverable or one of its transmissions.
  activationId: string | null;
};

/** What stands between a transmitted deliverable and its closing, and where
 * its follow-up lives in Activations (PROD-039, PROD-040). Counted here, the
 * database refuses the closing on the same rules. */
export async function loadClosureFacts(
  projectId: string,
  sheetId: string,
  deliverableId: string,
  handoffIds: string[],
): Promise<ClosureFacts> {
  const supabase = await createClient();
  const sources = [
    `deliverable_id.eq.${deliverableId}`,
    ...handoffIds.map((id) => `handoff_id.eq.${id}`),
  ].join(",");
  const [equipment, incidents, deliverable, activation] = await Promise.all([
    supabase
      .from("production_equipment")
      .select("id", { count: "exact", head: true })
      .eq("sheet_id", sheetId)
      .neq("source", "owned")
      .in("status", OUT),
    supabase
      .from("production_incidents")
      .select("id", { count: "exact", head: true })
      .eq("sheet_id", sheetId)
      .eq("blocks_closing", true)
      .is("resolved_at", null),
    supabase
      .from("strategy_deliverables")
      .select("assignee_person_id")
      .eq("id", deliverableId)
      .maybeSingle(),
    supabase
      .from("marketing_activations")
      .select("id")
      .eq("project_id", projectId)
      .or(sources)
      .order("created_at")
      .limit(1)
      .maybeSingle(),
  ]);
  for (const res of [equipment, incidents, deliverable, activation])
    if (res.error) console.error("loadClosureFacts:", res.error.message);
  return {
    equipmentOut: equipment.count ?? 0,
    blockingIncidents: incidents.count ?? 0,
    assigneePersonId: deliverable.data?.assignee_person_id ?? null,
    activationId: activation.data?.id ?? null,
  };
}
