import "server-only";

import type { BriefSheet } from "@/lib/design/brief-sheets";
import type { ConceptionData } from "@/lib/design/conception";
import type { SheetSummary } from "@/lib/design/sheet-summaries";
import type { SheetStatus } from "@/lib/design/states";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// The closing of the Conception and its transfer plan (MKT-C2-13): what
// was validated, against which Brief, and for each deliverable whether it
// goes to Production, is already there, stays in Conception, or is
// excluded with its reason. Computed by code from the database (RLS);
// « Passer en Production » itself is pass_to_production.

export type HandoffItemState = "ready" | "handed" | "not_ready" | "excluded";

export type HandoffItem = {
  // design_deliverables.id
  deliverableId: string;
  title: string;
  state: HandoffItemState;
  // Its sheet's status, or null without a sheet.
  sheetStatus: SheetStatus | null;
  // The approved version handed or to hand over.
  version: number | null;
  responsible: string | null;
  deliveryDate: string | null;
  dependencies: string | null;
  reserves: string[];
  exclusionReason: string | null;
};

export type ConceptionClosure = {
  briefNumber: number | null;
  closedAt: string | null;
  validatorName: string | null;
  comment: string | null;
  // The Production stage's state (not_started … validated).
  productionState: string;
  items: HandoffItem[];
  reopenings: Array<{
    reason: string;
    at: string;
    by: string | null;
    impact: Array<{ title: string; version: number; delivered: boolean }>;
  }>;
};

export async function loadConceptionClosure(
  projectId: string,
  data: Pick<ConceptionData, "deliverables" | "stage">,
  sheets: SheetSummary[],
  briefSheets: BriefSheet[],
): Promise<ConceptionClosure> {
  const supabase = await createClient();
  const sheetIds = sheets.map((s) => s.id);
  const [ws, validation, production, exclusions, submissions, rows, reopen] =
    await Promise.all([
      supabase
        .from("design_workspaces")
        .select(
          "closed_at, design_briefs!design_workspaces_closed_brief_id_fkey(number)",
        )
        .eq("project_id", projectId)
        .maybeSingle(),
      data.stage
        ? supabase
            .from("validations")
            .select(
              "decision_comment, decided_at, validator:people!validations_validator_person_id_fkey(first_name, last_name)",
            )
            .eq("project_stage_id", data.stage.id)
            .eq("state", "approved")
            .order("decided_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : { data: null },
      supabase
        .from("project_stages")
        .select("state, stage_definitions!inner(key)")
        .eq("project_id", projectId)
        .eq("stage_definitions.key", "production")
        .maybeSingle(),
      supabase
        .from("design_handoff_exclusions")
        .select("design_deliverable_id, reason")
        .eq("project_id", projectId),
      sheetIds.length
        ? supabase
            .from("design_submissions")
            .select(
              "id, sheet_id, number, design_decisions(decision, reserves)",
            )
            .in("sheet_id", sheetIds)
            .eq("status", "approved")
            .order("number", { ascending: false })
        : { data: [] },
      sheetIds.length
        ? supabase
            .from("design_sheets")
            .select("id, dependencies")
            .in("id", sheetIds)
        : { data: [] },
      supabase
        .from("design_reopenings")
        .select(
          "reason, reopened_at, impact, by:people!design_reopenings_reopened_by_fkey(first_name, last_name)",
        )
        .eq("project_id", projectId)
        .order("reopened_at", { ascending: false }),
    ]);

  const items = data.deliverables.map((d): HandoffItem => {
    const sheet = sheets.find((s) => s.deliverableId === d.id) ?? null;
    const approved = sheet
      ? (submissions.data ?? []).find((s) => s.sheet_id === sheet.id)
      : undefined;
    const info = briefSheets.find((s) => s.deliverableId === d.id);
    const excluded = (exclusions.data ?? []).find(
      (e) => e.design_deliverable_id === d.id,
    );
    const status = sheet?.status ?? null;
    return {
      deliverableId: d.id,
      title: d.title,
      state:
        status === "transferred"
          ? "handed"
          : excluded
            ? "excluded"
            : status === "ready_for_production"
              ? "ready"
              : "not_ready",
      sheetStatus: status,
      version: approved?.number ?? null,
      responsible: info?.responsible ?? null,
      deliveryDate: info?.deliveryDate ?? null,
      dependencies:
        (rows.data ?? []).find((r) => r.id === sheet?.id)?.dependencies ?? null,
      reserves: (approved?.design_decisions ?? []).flatMap((x) =>
        x.decision === "approved" && x.reserves ? [x.reserves] : [],
      ),
      exclusionReason: excluded?.reason ?? null,
    };
  });

  const v = validation.data;
  return {
    briefNumber: ws.data?.design_briefs?.number ?? null,
    closedAt: ws.data?.closed_at ?? null,
    validatorName: v?.validator
      ? personName(v.validator.first_name, v.validator.last_name)
      : null,
    comment: v?.decision_comment ?? null,
    productionState: production.data?.state ?? "not_started",
    items,
    reopenings: (reopen.data ?? []).map((r) => ({
      reason: r.reason,
      at: r.reopened_at,
      by: r.by ? personName(r.by.first_name, r.by.last_name) : null,
      impact: Array.isArray(r.impact)
        ? (r.impact as Array<{
            title: string;
            version: number;
            delivered: boolean;
          }>)
        : [],
    })),
  };
}
