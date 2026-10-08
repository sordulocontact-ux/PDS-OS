import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { todayInParis } from "@/lib/contracts/types";
import {
  buildSynthesis,
  type AnswerFact,
  type SynthesisSection,
} from "@/lib/legal/confirmation/synthesis";
import { readInventoryRows } from "@/lib/legal/inventory-rows";
import { loadIntake } from "@/lib/legal/intake/queries";
import {
  QUESTION_KEYS,
  factValueSchema,
  type QuestionKey,
} from "@/lib/legal/intake/types";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

export type Confirmation = {
  // not_started: no answer yet; draft: answered, not confirmed (or
  // reopened by a correction); confirmed.
  status: "not_started" | "draft" | "confirmed";
  confirmedAt: string | null;
  confirmedBy: string | null;
  // A correction reopened a dossier confirmed before (some facts still
  // carry their confirmation).
  reopened: boolean;
  // Questions still without an answer: confirmation waits for them.
  openQuestions: number;
  sections: SynthesisSection[];
};

const isQuestionKey = (value: string): value is QuestionKey =>
  (QUESTION_KEYS as readonly string[]).includes(value);

/** Everything the Confirmation step shows, read with the viewer's session. */
export async function loadConfirmation(
  project: {
    id: string;
    masters: Array<{ id: string; title: string; artists: string }>;
  },
  access: Access,
): Promise<Confirmation> {
  const supabase = await createClient();
  const [rows, intake, intakeRow, facts] = await Promise.all([
    readInventoryRows(
      project.id,
      project.masters,
      can(access, "manage_catalog"),
    ),
    loadIntake(project),
    supabase
      .from("legal_intakes")
      .select("status, confirmed_at, confirmed_by")
      .eq("project_id", project.id)
      .maybeSingle(),
    supabase
      .from("legal_facts")
      .select("question_key, master_id, kind, value, status")
      .eq("project_id", project.id)
      .is("superseded_by_answer_id", null)
      .order("created_at"),
  ]);
  if (intakeRow.error)
    console.error("loadConfirmation intake:", intakeRow.error.message);
  if (facts.error)
    console.error("loadConfirmation facts:", facts.error.message);

  const answers = (facts.data ?? []).flatMap((row): AnswerFact[] => {
    if (!isQuestionKey(row.question_key)) return [];
    const parsed = factValueSchema.safeParse({
      kind: row.kind,
      value: row.value,
    });
    return parsed.success
      ? [
          {
            question: row.question_key,
            masterId: row.master_id,
            fact: parsed.data,
            status: row.status,
          },
        ]
      : [];
  });

  const confirmer = intakeRow.data?.confirmed_by
    ? await supabase
        .from("people")
        .select("first_name, last_name")
        .eq("id", intakeRow.data.confirmed_by)
        .maybeSingle()
    : null;

  return {
    // Nothing to ask (no title, a contract already attached): the dossier is
    // ready to confirm without a single answer, never sent back to the
    // Cadrage (confirm_legal_intake opens it).
    status: !intakeRow.data
      ? intake.questions.length === 0
        ? "draft"
        : "not_started"
      : intakeRow.data.status === "confirmed"
        ? "confirmed"
        : "draft",
    confirmedAt: intakeRow.data?.confirmed_at ?? null,
    confirmedBy: confirmer?.data
      ? personName(confirmer.data.first_name, confirmer.data.last_name)
      : null,
    reopened:
      intakeRow.data?.status === "draft" &&
      answers.some((a) => a.status === "confirmed"),
    openQuestions: intake.questions.filter((q) => !q.answered).length,
    sections: buildSynthesis({
      projectId: project.id,
      rows,
      questions: intake.questions,
      answers,
      today: todayInParis(new Date()),
    }),
  };
}
