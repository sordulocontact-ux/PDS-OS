import "server-only";

import type { Access } from "@/lib/auth/access";
import { DEFAULT_DELIVERABLES } from "@/lib/master-workflow/brief-types";
import {
  answerItemsOf,
  QUESTION_DIMENSIONS,
  questionDeliverablesOf,
  type BriefQuestion,
  type BriefQuestionsView,
  type QuestionDimension,
} from "@/lib/master-workflow/question-types";
import { questionsToAsk } from "@/lib/master-workflow/questions-plan";
import { listProjectCreatives } from "@/lib/projects/creatives";
import { canEditProject } from "@/lib/projects/edit-access";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

const isDimension = (value: string): value is QuestionDimension =>
  (QUESTION_DIMENSIONS as readonly string[]).includes(value);

/**
 * What the questions need, read with the viewer's session (RLS): the
 * brief's artistic side (its defaults before the first save), the creative
 * directors, the questions already asked. Shared by the page and the
 * action that asks (which recomputes, never trusts the client).
 */
export async function readQuestionInputs(projectId: string) {
  const supabase = await createClient();
  const [brief, creatives, questions] = await Promise.all([
    supabase
      .from("master_briefs")
      .select("direction, deliverables")
      .eq("project_id", projectId)
      .maybeSingle(),
    listProjectCreatives(projectId),
    supabase
      .from("master_brief_questions")
      .select(
        "id, dimension, asked_to, created_at, answer_text, answer_choices, answer_items, answered_at, applied_at, person:people!master_brief_questions_asked_to_fkey(first_name, last_name)",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
  ]);
  if (brief.error) console.error("readQuestionInputs:", brief.error.message);
  if (questions.error)
    console.error("readQuestionInputs questions:", questions.error.message);
  return {
    brief: {
      direction: brief.data?.direction ?? null,
      deliverables: brief.data?.deliverables ?? DEFAULT_DELIVERABLES,
    },
    creatives,
    questions: questions.data ?? [],
    failed: Boolean(brief.error || questions.error),
  };
}

/** The questions section of the Brief page, ready to display. */
export async function loadBriefQuestions(
  project: { id: string; ownerPersonId: string | null },
  access: Access,
): Promise<BriefQuestionsView> {
  const inputs = await readQuestionInputs(project.id);
  const questions: BriefQuestion[] = inputs.questions.flatMap((row) =>
    isDimension(row.dimension)
      ? [
          {
            id: row.id,
            dimension: row.dimension,
            askedTo: {
              personId: row.asked_to,
              name: row.person
                ? personName(row.person.first_name, row.person.last_name)
                : "",
            },
            askedAt: row.created_at,
            answerText: row.answer_text,
            answerItems: answerItemsOf(row.answer_items),
            answerChoices: row.answer_choices
              ? questionDeliverablesOf(row.answer_choices)
              : null,
            answeredAt: row.answered_at,
            appliedAt: row.applied_at,
            isMine: row.asked_to === access.personId,
          },
        ]
      : [],
  );
  return {
    questions,
    toAsk: questionsToAsk(
      inputs.brief,
      inputs.creatives,
      questions.map((q) => ({
        dimension: q.dimension,
        personId: q.askedTo.personId,
      })),
      project.ownerPersonId,
    ),
    canAsk: canEditProject(access, project),
    noCreatives: !inputs.creatives.some(
      (person) => person.personId !== project.ownerPersonId,
    ),
    failed: inputs.failed,
  };
}
