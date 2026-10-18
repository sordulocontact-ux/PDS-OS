"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import {
  interpretAnswer,
  type Interpretation,
} from "@/lib/legal/intake/interpret";
import {
  QUESTION_KEYS,
  factValueSchema,
  type ProposedFact,
} from "@/lib/legal/intake/types";
import { knownContactOf } from "@/lib/legal/intake/known-people";
import { loadKnownPeople } from "@/lib/legal/intake/known-queries";
import { loadIntake } from "@/lib/legal/intake/queries";
import { getProject } from "@/lib/projects/queries";
import { withOutcome } from "@/lib/journey/outcome";
import type { WriteResult } from "@/lib/utils/write-result";
import { createClient } from "@/lib/supabase/server";

const questionSchema = z.object({
  projectId: catalogIdSchema,
  questionKey: z.enum(QUESTION_KEYS),
  masterId: catalogIdSchema.nullable(),
  text: z.string().trim().min(1).max(4000),
});

type Question = z.infer<typeof questionSchema>;

/** The project when the viewer may run its Juridique, and the title asked
 * about when it is one of the project's. */
async function guard(input: Question) {
  const access = await requireApproved();
  if (!can(access, "manage_legal")) return null;
  // Read with the session: a project the viewer does not see is null.
  const project = await getProject(input.projectId);
  if (!project) return null;
  const title = input.masterId
    ? project.masters.find((m) => m.id === input.masterId)
    : null;
  if (input.masterId && !title) return null;
  return { project, title: title?.title ?? null };
}

export type InterpretResult =
  Interpretation | { ok: false; error: "forbidden" };

/** PO reads the answer; nothing is written (the person reviews first). */
export async function interpretLegalAnswer(
  input: Question,
): Promise<InterpretResult> {
  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "forbidden" };
  const allowed = await guard(parsed.data);
  if (!allowed) return { ok: false, error: "forbidden" };
  return interpretAnswer(
    parsed.data.questionKey,
    allowed.title,
    parsed.data.text,
  );
}

const proposedSchema = z.intersection(
  factValueSchema,
  z.object({ quote: z.string().max(500).nullable() }),
);

export type SaveAnswerResult = { ok: true } | { ok: false; error: string };

/**
 * Keeps a reviewed answer and its facts (record_legal_answer, one
 * transaction): facts declared by the person, credits and clearances
 * created, the previous answer to the same question superseded.
 */
export async function saveLegalAnswer(
  input: Question & { facts: ProposedFact[] },
): Promise<SaveAnswerResult> {
  const t = fr.legal.intake.errors;
  const parsed = questionSchema
    .extend({ facts: z.array(proposedSchema).max(30) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: t.invalid };
  const { projectId, questionKey, masterId, text, facts } = parsed.data;
  if (!(await guard(parsed.data)))
    return { ok: false, error: fr.auth.errors.forbidden };

  // A person the title or the Cadrage already knows as a Réseau contact is
  // credited linked to it, read here again (never taken from the client).
  const known =
    questionKey === "contributors" && masterId
      ? ((await loadKnownPeople(projectId, [masterId])).get(masterId) ?? [])
      : [];
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_legal_answer", {
    p_project_id: projectId,
    p_question_key: questionKey,
    p_master_id: masterId,
    p_text: text,
    p_facts: facts.map(({ kind, value, quote }) => ({
      kind,
      value,
      quote,
      contact_id:
        kind === "contribution" ? knownContactOf(known, value.name) : null,
    })),
  });
  if (error) {
    console.error("saveLegalAnswer:", error.message);
    return { ok: false, error: t.failed };
  }
  revalidatePath(routes.projectLegal(projectId), "layout");
  for (const master of masterId ? [masterId] : [])
    revalidatePath(routes.master(master), "layout");
  return { ok: true };
}

export type ConfirmResult = WriteResult;

/**
 * Confirms the dossier (confirm_legal_intake): only once every question has
 * an answer, decided here by the same code that asks them.
 */
export async function confirmLegalIntake(
  projectId: string,
): Promise<ConfirmResult> {
  const t = fr.legal.confirmation.errors;
  const id = catalogIdSchema.safeParse(projectId);
  const access = await requireApproved();
  if (!id.success || !can(access, "manage_legal"))
    return { ok: false, error: fr.auth.errors.forbidden };
  const project = await getProject(id.data);
  if (!project) return { ok: false, error: fr.auth.errors.forbidden };
  const intake = await loadIntake(project);
  if (intake.questions.some((q) => !q.answered))
    return { ok: false, error: t.openQuestions };

  // Said after the gesture: who acts now, what opened (rule 7).
  return withOutcome(
    id.data,
    ["legal"],
    fr.legalJourney.done.confirmed,
    async () => {
      const supabase = await createClient();
      const { error } = await supabase.rpc("confirm_legal_intake", {
        p_project_id: id.data,
      });
      if (error) {
        console.error("confirmLegalIntake:", error.message);
        return { ok: false, error: t.failed };
      }
      revalidatePath(routes.projectLegal(id.data), "layout");
      return { ok: true };
    },
  );
}
