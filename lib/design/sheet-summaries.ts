import "server-only";

import { checksOf, loadFacts, statusOf } from "@/lib/design/sheets";
import type { SheetStatus } from "@/lib/design/states";
import { createClient } from "@/lib/supabase/server";

// The Fiches Livrables seen from elsewhere: the Conception's home, the
// list's planned quantities, the history of one sheet.

export type SheetSummary = {
  id: string;
  deliverableId: string;
  title: string;
  status: SheetStatus;
  // What still blocks its submission (MKT-C2-07: the gaps per deliverable).
  blockers: number;
};

/**
 * The sheets of a project as the Conception's home shows them. People and
 * Strategy dates are left out: a blocker on them only shows on the sheet.
 */
export async function loadSheetSummaries(
  projectId: string,
): Promise<SheetSummary[]> {
  const supabase = await createClient();
  const [facts, assignments, validators] = await Promise.all([
    loadFacts(projectId),
    supabase
      .from("design_assignments")
      .select("sheet_id, person_id")
      .eq("project_id", projectId)
      .eq("scope", "sheet")
      .is("ended_at", null),
    supabase
      .from("design_validators")
      .select("sheet_id, person_id")
      .eq("project_id", projectId)
      .eq("scope", "sheet"),
  ]);
  return facts.map((f) => {
    const checks = checksOf(f, {
      responsibleId:
        assignments.data?.find((a) => a.sheet_id === f.sheet.id)?.person_id ??
        null,
      validatorIds: (validators.data ?? [])
        .filter((v) => v.sheet_id === f.sheet.id)
        .map((v) => v.person_id),
      strategyDue: null,
      milestoneDate: null,
    });
    return {
      id: f.sheet.id,
      deliverableId: f.sheet.design_deliverable_id,
      title: f.sheet.title,
      status: statusOf(f, checks.blockers.length),
      blockers: checks.blockers.length,
    };
  });
}

/** The history of one sheet, newest first (design_events, by triggers). */
export async function loadSheetEvents(projectId: string, sheetId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("design_events")
    .select("id, kind, data, actor, created_at")
    .eq("project_id", projectId)
    .eq("sheet_id", sheetId)
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []).map((e) => ({
    id: e.id,
    kind: e.kind,
    data: e.data,
    actor: e.actor,
    createdAt: e.created_at,
  }));
}
export type SheetEvent = Awaited<ReturnType<typeof loadSheetEvents>>[number];

/** Quantity the Stratégie committed to, per design deliverable (> 1 only). */
export async function loadPlannedQuantities(
  projectId: string,
): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("design_deliverables")
    .select("id, strategy_deliverables(quantity)")
    .eq("project_id", projectId);
  return Object.fromEntries(
    (data ?? []).flatMap((d) => {
      const q = d.strategy_deliverables?.quantity ?? null;
      return q !== null && q > 1 ? [[d.id, q]] : [];
    }),
  );
}
