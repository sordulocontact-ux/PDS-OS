import "server-only";

import type { QuestionState } from "@/lib/framing/assess";
import { QUESTIONS, type QuestionKey } from "@/lib/framing/dimensions";
import type { FramingKnowledge } from "@/lib/framing/knowledge";
import type { createClient } from "@/lib/supabase/server";

// « Confirmer » a question to confirm (docs/ARCHITECTURE.md § 6), shared by
// the screen (confirmQuestion) and PO's test data (fill_page_test_data):
// what is proposed becomes known, with the source it already had.

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** A Brief row as appended by the Cadrage (history kept). */
export type BriefRow = {
  value: unknown;
  status: "confirmed" | "proposed" | "rejected";
  source_type: "manual" | "call" | "import" | "voice";
  source_report_item_id?: string | null;
  source_quote?: string | null;
  source_start_seconds?: number | null;
  source_label?: string | null;
};

/**
 * The confirmed row of a text, date or amount question to confirm: a value
 * recorded elsewhere is written with where it came from, a stored proposal
 * keeps its source (call, dictation, initial context). Null when there is
 * nothing to confirm.
 */
export function confirmedRow(
  state: QuestionState,
  knowledge: FramingKnowledge,
): BriefRow | null {
  const answer = state.answer;
  if (state.status !== "to_confirm" || !answer) return null;
  const value =
    answer.kind === "text"
      ? answer.text
      : answer.kind === "date"
        ? answer.date
        : answer.kind === "money"
          ? answer.cents
          : { none: true };
  if (state.fromRecord)
    return {
      value,
      status: "confirmed",
      source_type: "import",
      source_label:
        state.provenance?.kind === "record" ? state.provenance.label : null,
    };
  const row = knowledge.framing.briefRows.find(
    (r) => r.field_key === state.key,
  );
  if (!row) return null;
  return {
    value,
    status: "confirmed",
    source_type: row.source_type as BriefRow["source_type"],
    source_report_item_id: row.source_report_item_id,
    source_quote: row.source_quote,
    source_start_seconds: row.source_start_seconds,
    source_label: row.source_label,
  };
}

/** Confirms together the proposed lines of a list question. */
export function confirmLines(
  supabase: Supabase,
  projectId: string,
  key: QuestionKey,
) {
  const kind = QUESTIONS[key].kind;
  const confirmed = { review_status: "confirmed" };
  if (kind === "constraints" || kind === "rights") {
    const lines = supabase
      .from("framing_constraints")
      .update(confirmed)
      .eq("project_id", projectId)
      .eq("review_status", "proposed");
    return kind === "rights"
      ? lines.eq("type", "rights")
      : lines.neq("type", "rights");
  }
  if (kind === "deadlines")
    // A proposed deadline without its date waits for a person to pick it.
    return supabase
      .from("framing_deadlines")
      .update(confirmed)
      .eq("project_id", projectId)
      .eq("review_status", "proposed")
      .not("due_date", "is", null);
  return supabase
    .from(kind === "needs" ? "needs" : "project_team_members")
    .update(confirmed)
    .eq("project_id", projectId)
    .eq("review_status", "proposed");
}
