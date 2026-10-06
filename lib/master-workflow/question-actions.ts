"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { QUESTION_DELIVERABLES } from "@/lib/master-workflow/question-types";
import { readQuestionInputs } from "@/lib/master-workflow/questions";
import { questionsToAsk } from "@/lib/master-workflow/questions-plan";
import { createClient } from "@/lib/supabase/server";

export type QuestionResult = { ok: true } | { ok: false; error: string };

const t = fr.masterWorkflow.questions;

function refresh(projectId: string) {
  revalidatePath(routes.projectMasterStep(projectId, "brief"));
  revalidatePath(routes.projectWork(projectId));
}

/**
 * The owner asks what the brief lacks to whoever is responsible for it:
 * the recipients are recomputed here (questions-plan.ts), never taken from
 * the client; ask_master_brief_questions checks again and creates one task
 * of the Travail per question.
 */
export async function askBriefQuestions(
  projectId: string,
): Promise<QuestionResult> {
  const input = z.uuid().safeParse(projectId);
  await requireApproved();
  if (!input.success) return { ok: false, error: t.errors.failed };
  const supabase = await createClient();
  const [project, inputs] = await Promise.all([
    supabase
      .from("projects")
      .select("owner_person_id")
      .eq("id", input.data)
      .maybeSingle(),
    readQuestionInputs(input.data),
  ]);
  if (!project.data || inputs.failed)
    return { ok: false, error: t.errors.failed };
  const plan = questionsToAsk(
    inputs.brief,
    inputs.creatives,
    inputs.questions.map((q) => ({
      dimension: q.dimension,
      personId: q.asked_to,
    })),
    project.data.owner_person_id,
  );
  if (plan.length === 0) return { ok: false, error: t.errors.nothing };
  const items = plan.flatMap(({ dimension, people }) =>
    people.map((person) => ({
      dimension,
      person_id: person.personId,
      task_title: t.taskTitle[dimension],
    })),
  );
  const { error } = await supabase.rpc("ask_master_brief_questions", {
    p_project_id: input.data,
    p_items: items,
  });
  if (error) {
    console.error("askBriefQuestions:", error.code, error.message);
    return {
      ok: false,
      error: error.code === "42501" ? t.errors.forbidden : t.errors.failed,
    };
  }
  refresh(input.data);
  return { ok: true };
}

const answerInput = z.object({
  projectId: z.uuid(),
  questionId: z.uuid(),
  text: z.string().trim().max(2000),
  choices: z.array(z.enum(QUESTION_DELIVERABLES)).max(7).nullable(),
});

/** The person asked answers, once; their task is ticked with it. */
export async function answerBriefQuestion(
  projectId: string,
  questionId: string,
  text: string,
  choices: string[] | null,
): Promise<QuestionResult> {
  const input = answerInput.safeParse({ projectId, questionId, text, choices });
  await requireApproved();
  if (!input.success) return { ok: false, error: t.errors.answer };
  const supabase = await createClient();
  const { error } = await supabase.rpc("answer_master_question", {
    p_question_id: input.data.questionId,
    p_text: input.data.text,
    // Text questions send no choices (null in SQL).
    p_choices: input.data.choices ?? undefined,
  });
  if (error) {
    console.error("answerBriefQuestion:", error.code, error.message);
    return {
      ok: false,
      error:
        error.code === "42501"
          ? t.errors.notYours
          : error.message.includes("empty_answer")
            ? t.errors.empty
            : error.message.includes("already_answered")
              ? t.errors.already
              : t.errors.answer,
    };
  }
  refresh(input.data.projectId);
  return { ok: true };
}

/** The owner puts an answer into the brief (apply_master_question). */
export async function applyBriefQuestion(
  projectId: string,
  questionId: string,
): Promise<QuestionResult> {
  const input = z
    .object({ projectId: z.uuid(), questionId: z.uuid() })
    .safeParse({ projectId, questionId });
  await requireApproved();
  if (!input.success) return { ok: false, error: t.errors.failed };
  const supabase = await createClient();
  const { error } = await supabase.rpc("apply_master_question", {
    p_question_id: input.data.questionId,
  });
  if (error) {
    console.error("applyBriefQuestion:", error.code, error.message);
    return {
      ok: false,
      error: error.code === "42501" ? t.errors.forbidden : t.errors.failed,
    };
  }
  refresh(input.data.projectId);
  return { ok: true };
}
