import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { parseSaidBudgetStatus } from "@/lib/assistant/verbatim";
import { FRAMING_FACTS_INSTRUCTIONS } from "@/lib/ai/instructions/framing-facts";
import { extract } from "@/lib/ai/llm";
import { locateQuote, type QuoteLocation } from "@/lib/ai/provenance";
import {
  framingFactsSchema,
  type FramingFacts,
} from "@/lib/ai/schemas/framing-facts";
import type { Transcript } from "@/lib/ai/schemas/transcript";
import { linkTeamToMembers } from "@/lib/framing/team-link";
import {
  QUESTIONS,
  type Dimension,
  type QuestionKey,
} from "@/lib/framing/dimensions";
import type { FramingKnowledge } from "@/lib/framing/knowledge";
import { findSaidDate, findSaidEuros } from "@/lib/framing/said";
import { fr } from "@/lib/i18n/fr";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

// PO reads a text about the project — the initial context noted at its
// transmission, or a framing call's transcript — and proposes answers for
// the six dimensions (ticket § 2 and § 6). Everything lands « à confirmer »:
// « une donnée inférée d'un Call ne devient jamais une vérité Projet sans
// confirmation humaine ». A quote not found in the text is dropped; a value
// already confirmed is never touched; a closed dimension is left alone.

export type AnalysisSource =
  // `label`: where the words come from, said as the provenance (default:
  // « Contexte initial »; with the transmission's clarifications, PROJ-UX-02).
  | { kind: "context"; text: string; label?: string }
  | { kind: "call"; reportId: string; transcript: Transcript };

const TEXT_KEYS = [
  "objective",
  "success_criteria",
  "main_priority",
  "calendar_constraints",
  "prerequisites",
  "commitments",
  "decision_makers",
  "missing_skills",
  "current_state",
  "existing_elements",
  "decisions_made",
  "work_started",
  // Not legal_parties: the parties come from the records and each one is
  // qualified by a person (PROJ-BUG-03), never written by PO.
  "legal_agreements",
  "legal_needs",
  "legal_secured",
] as const satisfies readonly (keyof FramingFacts & QuestionKey)[];

/** Dimensions the Cadrage still takes changes in (a correction narrows them). */
export function editableDimensions(
  k: FramingKnowledge,
): (d: Dimension) => boolean {
  const stage = k.framing.stage?.state ?? "not_started";
  if (stage !== "not_started" && stage !== "in_progress") return () => false;
  const latest = k.briefs[0];
  const reopened =
    latest &&
    (latest.state === "pending" || latest.state === "changes_requested")
      ? latest.reopened_dimensions
      : null;
  return (d) => !reopened || reopened.includes(d);
}

// The free model sometimes adds Markdown (*Für Elise*): plain text only.
const clean = (text: string) => text.replace(/[*`#]+/g, "").trim();

function location(at: QuoteLocation) {
  return at.status === "timed"
    ? { located: "timed", start_seconds: at.start, end_seconds: at.end }
    : { located: at.status, start_seconds: null, end_seconds: null };
}

export async function analyseForFraming(
  supabase: Client,
  k: FramingKnowledge,
  source: AnalysisSource,
): Promise<{ ok: true; proposed: number } | { ok: false; error: "provider" }> {
  const text = source.kind === "context" ? source.text : source.transcript.text;
  if (!text.trim()) return { ok: true, proposed: 0 };
  const transcript: Transcript =
    source.kind === "call" ? source.transcript : { text, segments: [] };

  let facts: FramingFacts;
  try {
    ({ output: facts } = await extract(
      framingFactsSchema,
      text,
      FRAMING_FACTS_INSTRUCTIONS,
    ));
  } catch (error) {
    console.error("analyseForFraming:", error);
    return { ok: false, error: "provider" };
  }

  const org = k.framing.project.organizationId;
  const projectId = k.project.id;
  const open = editableDimensions(k);
  const label =
    (source.kind === "context" && source.label) ||
    fr.framingIntel.sources.initialContext;
  const stored = new Map(k.framing.briefRows.map((r) => [r.field_key, r]));
  // A question already confirmed or proposed is not proposed again.
  const settled = (key: QuestionKey) => {
    const row = stored.get(key);
    return row !== undefined && row.status !== "rejected";
  };
  const found = (quote: string | null | undefined) => {
    if (!quote || quote.trim().split(/\s+/).length < 2) return null;
    const at = locateQuote(quote, transcript);
    return at.status === "missing" ? null : { quote: quote.trim(), at };
  };

  // A call's facts become items of its report, so they are located and
  // linked like any other (provenance with the moment of the call).
  type Pending = {
    key: string;
    what: string;
    quote: string;
    at: QuoteLocation;
  };
  const pending: Pending[] = [];
  const add = (
    key: QuestionKey | "deadlines",
    what: string,
    q: { quote: string; at: QuoteLocation },
  ) => pending.push({ key, what, ...q });

  // Numbers in a reworded value must be in its quote: « budget total
  // 8 000 € » never becomes « 8 000 € engagés » (UX test of 09/10/2026).
  const numbersOf = (text: string) =>
    (text.match(/\d[\d\s\u00a0\u202f.,]*/g) ?? []).map((n) =>
      n.replace(/[\s\u00a0\u202f.,]/g, ""),
    );
  const numbersKept = (value: string, quote: string) => {
    const said = new Set(numbersOf(quote));
    return numbersOf(value).every((n) => said.has(n));
  };
  const budgetQuote = found(facts.budget_quote)?.quote ?? null;
  for (const key of TEXT_KEYS) {
    const fact = facts[key];
    if (!fact?.value?.trim() || settled(key) || !open(QUESTIONS[key].dimension))
      continue;
    const q = found(fact.quote);
    if (!q || !numbersKept(fact.value, q.quote)) continue;
    // An engagement is a spend said committed or paid, never the envelope.
    if (
      key === "commitments" &&
      (parseSaidBudgetStatus(q.quote) === null ||
        parseSaidBudgetStatus(q.quote) === "planned" ||
        (budgetQuote !== null && q.quote.trim() === budgetQuote.trim()))
    )
      continue;
    add(key, clean(fact.value), q);
  }
  if (!settled("target_date") && open("timing")) {
    const q = found(facts.target_date_quote);
    const date = q ? findSaidDate(q.quote) : null;
    if (q && date) add("target_date", date, q);
  }
  if (!settled("budget_envelope") && open("budget")) {
    const q = found(facts.budget_quote);
    const cents = q ? findSaidEuros(q.quote) : null;
    if (q && cents !== null) add("budget_envelope", String(cents), q);
  }
  const deadlines = open("timing")
    ? facts.deadlines.flatMap((d) => {
        const q = found(d.quote);
        return q ? [{ kind: d.kind, date: findSaidDate(q.quote), ...q }] : [];
      })
    : [];

  let itemIds = new Map<number, string>();
  if (source.kind === "call" && (pending.length || deadlines.length)) {
    const { data: last } = await supabase
      .from("report_items")
      .select("position")
      .eq("report_id", source.reportId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const start = (last?.position ?? 0) + 1;
    const rows = [
      ...pending.map((p) => ({
        key: p.key,
        what: p.what,
        quote: p.quote,
        at: p.at,
      })),
      ...deadlines.map((d) => ({
        key: "deadlines",
        what: d.kind,
        quote: d.quote,
        at: d.at,
      })),
    ].map((p, i) => ({
      organization_id: org,
      report_id: source.reportId,
      kind: "brief_fact",
      brief_key: p.key,
      position: start + i,
      what: p.what,
      quote: p.quote,
      ...location(p.at),
    }));
    const { data, error } = await supabase
      .from("report_items")
      .insert(rows)
      .select("id, position");
    if (error) {
      console.error("analyseForFraming: report items", error.message);
      return { ok: true, proposed: 0 };
    }
    itemIds = new Map((data ?? []).map((r) => [r.position - start, r.id]));
  }

  const sourceOf = (index: number, q: { quote: string; at: QuoteLocation }) =>
    source.kind === "call"
      ? {
          source_type: "call",
          source_report_item_id: itemIds.get(index) ?? null,
          source_quote: q.quote,
          source_start_seconds: q.at.status === "timed" ? q.at.start : null,
        }
      : { source_type: "import", source_quote: q.quote, source_label: label };

  const fieldRows = pending
    .map((p, i) => ({ p, i }))
    .filter(({ i }) => source.kind === "context" || itemIds.has(i))
    .map(({ p, i }) => ({
      organization_id: org,
      project_id: projectId,
      deliverable: "brief",
      field_key: p.key,
      value: (p.key === "budget_envelope" ? Number(p.what) : p.what) as never,
      status: "proposed",
      ...sourceOf(i, p),
    }));
  const deadlineRows = deadlines
    .map((d, j) => ({ d, i: pending.length + j }))
    .filter(({ i }) => source.kind === "context" || itemIds.has(i))
    .map(({ d, i }) => ({
      organization_id: org,
      project_id: projectId,
      kind: d.kind,
      label: d.kind === "other" ? d.quote.slice(0, 200) : null,
      due_date: d.date,
      review_status: "proposed",
      ...sourceOf(i, d),
    }));

  // Lines of the context only: a call's needs, constraints and team come
  // from its report (lib/framing/import-report.ts).
  const contextSource = { source_type: "import", source_label: label };
  const needs =
    source.kind === "context" && open("objective")
      ? facts.needs.flatMap((n) => {
          const q = found(n.quote);
          return q && n.label.trim()
            ? [
                {
                  organization_id: org,
                  project_id: projectId,
                  label: clean(n.label).slice(0, 200),
                  family: n.family,
                  review_status: "proposed",
                  ...contextSource,
                  source_quote: q.quote,
                },
              ]
            : [];
        })
      : [];
  const constraints =
    source.kind === "context"
      ? facts.constraints.flatMap((c) => {
          const q = found(c.quote);
          const dimension: Dimension = c.type === "rights" ? "legal" : "budget";
          return q && c.text.trim() && open(dimension)
            ? [
                {
                  organization_id: org,
                  project_id: projectId,
                  type: c.type,
                  text: clean(c.text).slice(0, 500),
                  review_status: "proposed",
                  ...contextSource,
                  source_quote: q.quote,
                },
              ]
            : [];
        })
      : [];
  const team =
    source.kind === "context" && open("team")
      ? facts.team.flatMap((m) => {
          const q = found(m.quote);
          return q && m.name.trim()
            ? [
                {
                  organization_id: org,
                  project_id: projectId,
                  display_name: clean(m.name).slice(0, 120),
                  role: m.role?.trim() || null,
                  review_status: "proposed",
                  ...contextSource,
                  source_quote: q.quote,
                },
              ]
            : [];
        })
      : [];

  const results = await Promise.all([
    fieldRows.length ? supabase.from("field_values").insert(fieldRows) : null,
    deadlineRows.length
      ? supabase.from("framing_deadlines").insert(deadlineRows)
      : null,
    needs.length ? supabase.from("needs").insert(needs) : null,
    constraints.length
      ? supabase.from("framing_constraints").insert(constraints)
      : null,
    team.length
      ? supabase
          .from("project_team_members")
          .insert(await linkTeamToMembers(supabase, team))
      : null,
  ]);
  for (const r of results)
    if (r?.error) console.error("analyseForFraming:", r.error.message);
  return {
    ok: true,
    proposed:
      fieldRows.length +
      deadlineRows.length +
      needs.length +
      constraints.length +
      team.length,
  };
}
