import "server-only";

import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

// Where each Production deliverable comes from in the Conception
// (MKT-C2-13): the validated sheet and Brief handed over, or the reason it
// stayed in Conception. Keyed by strategy_deliverables.id. Empty while the
// Conception has handed nothing: Production then works as before.

export type ConceptionLink =
  | { state: "handed"; sheetVersion: number; briefNumber: number | null }
  | { state: "excluded"; reason: string }
  | { state: "waiting" };

export async function loadConceptionLinks(
  supabase: Client,
  projectId: string,
): Promise<Map<string, ConceptionLink>> {
  const [handoffs, exclusions, deliverables] = await Promise.all([
    supabase
      .from("design_handoffs")
      .select(
        "confirmed_at, design_sheets!design_handoffs_sheet_same_org(design_deliverable_id), design_submissions!design_handoffs_submission_same_org(number), design_briefs(number)",
      )
      .eq("project_id", projectId)
      .order("confirmed_at", { ascending: false }),
    supabase
      .from("design_handoff_exclusions")
      .select("design_deliverable_id, reason")
      .eq("project_id", projectId),
    supabase
      .from("design_deliverables")
      .select("id, strategy_deliverable_id")
      .eq("project_id", projectId),
  ]);
  const links = new Map<string, ConceptionLink>();
  if (!(handoffs.data ?? []).length) return links;
  for (const d of deliverables.data ?? []) {
    if (!d.strategy_deliverable_id) continue;
    // Newest first: the latest handoff of its sheet.
    const handed = (handoffs.data ?? []).find(
      (h) => h.design_sheets?.design_deliverable_id === d.id,
    );
    const excluded = (exclusions.data ?? []).find(
      (e) => e.design_deliverable_id === d.id,
    );
    links.set(
      d.strategy_deliverable_id,
      handed?.design_submissions
        ? {
            state: "handed",
            sheetVersion: handed.design_submissions.number,
            briefNumber: handed.design_briefs?.number ?? null,
          }
        : excluded
          ? { state: "excluded", reason: excluded.reason }
          : { state: "waiting" },
    );
  }
  return links;
}
