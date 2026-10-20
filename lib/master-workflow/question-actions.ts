"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { QUESTION_DELIVERABLES } from "@/lib/master-workflow/question-types";
import { createClient } from "@/lib/supabase/server";

export type QuestionResult = { ok: true } | { ok: false; error: string };

const t = fr.masterWorkflow.questions;

function refresh(projectId: string) {
  revalidatePath(routes.projectMasterStep(projectId, "brief"));
  revalidatePath(routes.projectWork(projectId));
}

const answerInput = z.object({
  projectId: z.uuid(),
  questionId: z.uuid(),
  text: z.string().trim().max(2000),
  choices: z.array(z.enum(QUESTION_DELIVERABLES)).max(7).nullable(),
  // What PO read in a direction answer, each item with its quote (checked
  // again word for word by the database).
  items: z
    .array(
      z.object({
        group: z.enum(["direction", "references", "constraints"]),
        label: z.string().trim().min(1).max(200),
        quote: z.string().trim().min(3).max(2000),
      }),
    )
    .max(30)
    .nullable(),
});

/** The person asked answers, once; their task is ticked with it. */
export async function answerBriefQuestion(
  projectId: string,
  questionId: string,
  text: string,
  choices: string[] | null,
  items: Array<{ group: string; label: string; quote: string }> | null = null,
): Promise<QuestionResult> {
  const input = answerInput.safeParse({
    projectId,
    questionId,
    text,
    choices,
    items,
  });
  await requireApproved();
  if (!input.success) return { ok: false, error: t.errors.answer };
  const supabase = await createClient();
  const { error } = input.data.items
    ? await supabase.rpc("answer_master_question_read", {
        p_question_id: input.data.questionId,
        p_text: input.data.text,
        p_items: input.data.items,
      })
    : await supabase.rpc("answer_master_question", {
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
          : error.message.includes("not_verbatim")
            ? fr.masterAnswer.notVerbatim
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
