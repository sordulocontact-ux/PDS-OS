import "server-only";

import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { personName } from "@/lib/projects/types";
import type {
  FieldHistoryRow,
  ProposalRecord,
  StrategyAnswerField,
} from "@/lib/strategy/dimension-items";
import { STRATEGY_TEXT_FIELDS } from "@/lib/framing/brief";
import { choicesKey } from "@/lib/strategy/choices";
import { STRATEGY_ANSWER_FIELDS } from "@/lib/strategy/dimension-items";
import type { LeverRecord } from "@/lib/strategy/dimension-levers";
import { createClient } from "@/lib/supabase/server";
import { formatShortDay } from "@/lib/utils/day";

export type StrategyCallInfo = {
  callId: string;
  occurredAt: string;
  createdAt: string;
  // Recorded or processed: its page carries the pipeline.
  recorded: boolean;
  // Its report exists: PO proposed what was said.
  reported: boolean;
  // Its transcription or its report failed: the owner relaunches it.
  failed: boolean;
};

/** The project's strategy exchange (strategy_calls), the latest prepared. */
export async function loadStrategyCall(
  projectId: string,
): Promise<StrategyCallInfo | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("strategy_calls")
    .select(
      "created_at, call:calls!inner(id, occurred_at, status, audio_path, call_reports(id))",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) console.error("[strategy] call:", error.message);
  if (!data?.call) return null;
  return {
    callId: data.call.id,
    occurredAt: data.call.occurred_at,
    createdAt: data.created_at,
    recorded: Boolean(data.call.audio_path) || data.call.status !== "draft",
    reported: (data.call.call_reports ?? []).length > 0,
    failed: data.call.status === "failed",
  };
}

/**
 * What « Les 8 dimensions » reads beyond loadStrategy: the history of the
 * answer fields (a rejection keeps its words), PO's proposals of
 * deliverables, milestones and objectives, every lever (those not retained
 * too) and who started the strategy.
 */
export async function loadDimensionSources(projectId: string) {
  const supabase = await createClient();
  const [fields, proposals, levers, workspace] = await Promise.all([
    supabase
      .from("field_values")
      .select(
        "field_key, value, status, source_type, source_report_item_id, source_quote, created_by",
      )
      .eq("project_id", projectId)
      .eq("deliverable", "strategy")
      // The checked choices too: an answer only checked is still an answer
      // (recette 23/10, MKT-STR-001; fieldItem).
      .in("field_key", [
        ...STRATEGY_ANSWER_FIELDS,
        ...STRATEGY_TEXT_FIELDS.map(choicesKey),
      ])
      .order("created_at"),
    supabase
      .from("strategy_proposals")
      .select(
        "id, kind, text, proposed_text, format, offset_days, state, source_type, source_report_item_id, source_quote, item_id, decided_by, created_by",
      )
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("levers")
      .select(
        "id, label, family, state, review_status, source_type, source_report_item_id, source_quote, need_id, proposed_label, decided_by, created_by",
      )
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("strategy_workspaces")
      .select(
        "started_at, starter:people!strategy_workspaces_started_by_fkey(first_name, last_name)",
      )
      .eq("project_id", projectId)
      .maybeSingle(),
  ]);
  for (const r of [fields, proposals, levers, workspace])
    if (r.error) console.error("[strategy] dimensions:", r.error.message);
  return {
    fieldRows: (fields.data ?? []) as FieldHistoryRow[],
    proposals: (proposals.data ?? []) as ProposalRecord[],
    levers: (levers.data ?? []) as LeverRecord[],
    workspace: workspace.data
      ? {
          startedAt: workspace.data.started_at,
          startedBy: workspace.data.starter
            ? personName(
                workspace.data.starter.first_name,
                workspace.data.starter.last_name,
              )
            : null,
        }
      : null,
  };
}

export type SourceLabel = { from: string; href: string | null };

/**
 * Where each report item was said: « Échange stratégique du 05/10 » for
 * the project's strategy exchange, else the call's title and day; the
 * call's page as the link.
 */
export async function loadItemSources(
  projectId: string,
  itemIds: string[],
): Promise<Map<string, SourceLabel>> {
  const ids = [...new Set(itemIds)];
  const out = new Map<string, SourceLabel>();
  if (ids.length === 0) return out;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("report_items")
    .select(
      "id, report:call_reports!inner(call:calls!inner(id, title, occurred_at, strategy_calls(call_id)))",
    )
    .in("id", ids);
  if (error) console.error("[strategy] sources:", error.message);
  for (const row of data ?? []) {
    const call = row.report?.call;
    if (!call) continue;
    const day = formatShortDay(call.occurred_at, { bare: true });
    const strategy = Array.isArray(call.strategy_calls)
      ? call.strategy_calls.length > 0
      : Boolean(call.strategy_calls);
    out.set(row.id, {
      from: strategy
        ? fr.strategyDimensions.saidIn(day)
        : `${call.title} du ${day}`,
      href: routes.projectCall(projectId, call.id),
    });
  }
  return out;
}

export const sourcedItemIds = (rows: {
  fieldRows: FieldHistoryRow[];
  proposals: ProposalRecord[];
  levers: LeverRecord[];
}) =>
  [...rows.fieldRows, ...rows.proposals, ...rows.levers].flatMap((r) =>
    r.source_report_item_id ? [r.source_report_item_id] : [],
  );

export type { StrategyAnswerField };
