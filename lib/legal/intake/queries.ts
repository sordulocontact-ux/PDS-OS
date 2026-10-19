import "server-only";

import { cadrageAnswers } from "@/lib/legal/intake/cadrage";
import { loadKnownPeople } from "@/lib/legal/intake/known-queries";
import {
  answerKey,
  intakeQuestions,
  notAskedQuestions,
  type IntakeKnowledge,
} from "@/lib/legal/intake/questions";
import {
  QUESTION_KEYS,
  factValueSchema,
  type IntakeQuestion,
  type NotAskedQuestion,
  type ProposedFact,
  type QuestionKey,
} from "@/lib/legal/intake/types";
import { createClient } from "@/lib/supabase/server";
import { memoPerRequest } from "@/lib/utils/request-memo";

// The Cadrage juridique of a project in one round of parallel queries, with
// the viewer's session: RLS shows the legal tables to manage_legal only, and
// the splits to manage_catalog (a publisher already in the publishing split
// settles that question).

// A project's answers stay far below this.
const ANSWERS_LIMIT = 500;

function failed(scope: string, error: { message: string } | null) {
  if (error) console.error(`loadIntake ${scope}:`, error.message);
}

const isQuestionKey = (value: string): value is QuestionKey =>
  (QUESTION_KEYS as readonly string[]).includes(value);

export type Intake = {
  questions: IntakeQuestion[];
  // Questions reliable data settles, not asked.
  notAsked: NotAskedQuestion[];
  // Third-party elements to secure, opened by the answers.
  clearances: number;
};

/** Once per request for the same project and titles (the Juridique's
 * journey, its steps done and the workflow statuses all read it). */
export const loadIntake = memoPerRequest(
  (project: { id: string; masters: Array<{ id: string; title: string }> }) =>
    JSON.stringify([project.id, project.masters.map((m) => [m.id, m.title])]),
  readIntake,
);

async function readIntake(project: {
  id: string;
  masters: Array<{ id: string; title: string }>;
}): Promise<Intake> {
  const supabase = await createClient();
  const masterIds = project.masters.map((m) => m.id);
  const titled = masterIds.length > 0;
  const none = Promise.resolve({ data: [], error: null });

  const [
    credits,
    publishers,
    contracts,
    answers,
    facts,
    clearances,
    constraints,
    briefLegal,
    known,
  ] = await Promise.all([
    titled
      ? supabase
          .from("master_contributors")
          .select("master_id")
          .in("master_id", masterIds)
      : none,
    titled
      ? supabase
          .from("master_splits")
          .select("master_id")
          .in("master_id", masterIds)
          .eq("kind", "publishing")
          .eq("role", "publisher")
      : none,
    supabase
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id),
    supabase
      .from("legal_answers")
      .select("question_key, master_id, text, created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(ANSWERS_LIMIT),
    supabase
      .from("legal_facts")
      .select("question_key, master_id, kind, value, source_quote")
      .eq("project_id", project.id)
      .is("superseded_by_answer_id", null)
      .order("created_at"),
    supabase
      .from("legal_clearances")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id),
    // What the Cadrage confirmed about rights and agreements.
    supabase
      .from("framing_constraints")
      .select("text")
      .eq("project_id", project.id)
      .eq("type", "rights")
      .eq("review_status", "confirmed")
      .order("created_at"),
    supabase
      .from("current_field_values")
      .select("field_key, value")
      .eq("project_id", project.id)
      .eq("deliverable", "brief")
      .in("field_key", ["legal_agreements", "legal_blockers"])
      .eq("status", "confirmed"),
    // Who the titles and the Cadrage already name (people question).
    loadKnownPeople(project.id, masterIds),
  ]);
  failed("credits", credits.error);
  failed("publishers", publishers.error);
  failed("contracts", contracts.error);
  failed("answers", answers.error);
  failed("facts", facts.error);
  failed("clearances", clearances.error);
  failed("cadrage constraints", constraints.error);
  failed("cadrage fields", briefLegal.error);

  // Active facts by question and title; a row the schema refuses is skipped.
  const factsOf = new Map<string, ProposedFact[]>();
  for (const row of facts.data ?? []) {
    if (!isQuestionKey(row.question_key)) continue;
    const parsed = factValueSchema.safeParse({
      kind: row.kind,
      value: row.value,
    });
    if (!parsed.success) continue;
    const key = answerKey(row.question_key, row.master_id);
    factsOf.set(key, [
      ...(factsOf.get(key) ?? []),
      { ...parsed.data, quote: row.source_quote },
    ]);
  }
  // The latest answer of each question (rows come newest first).
  const answersOf: IntakeKnowledge["answers"] = new Map();
  for (const row of answers.data ?? []) {
    if (!isQuestionKey(row.question_key)) continue;
    const key = answerKey(row.question_key, row.master_id);
    if (!answersOf.has(key))
      answersOf.set(key, { text: row.text, facts: factsOf.get(key) ?? [] });
  }

  const titles = project.masters.map((m) => ({ id: m.id, title: m.title }));
  const knowledge: IntakeKnowledge = {
    titles,
    cadrage: cadrageAnswers(titles, {
      constraints: (constraints.data ?? []).map((row) => row.text),
      fields: new Map(
        (briefLegal.data ?? []).flatMap((row) =>
          row.field_key ? [[row.field_key, row.value]] : [],
        ),
      ),
    }),
    creditedTitles: new Set((credits.data ?? []).map((r) => r.master_id)),
    publishedTitles: new Set((publishers.data ?? []).map((r) => r.master_id)),
    hasContract: (contracts.count ?? 0) > 0,
    known,
    answers: answersOf,
  };
  return {
    questions: intakeQuestions(knowledge),
    notAsked: notAskedQuestions(knowledge),
    clearances: clearances.count ?? 0,
  };
}
