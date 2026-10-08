"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { assessFraming, findQuestion } from "@/lib/framing/assess";
import {
  confirmLines,
  confirmedRow,
  type BriefRow,
} from "@/lib/framing/confirm";
import {
  QUESTIONS,
  isQuestionKey,
  type QuestionKey,
} from "@/lib/framing/dimensions";
import { loadFramingKnowledge } from "@/lib/framing/knowledge";
import {
  fail,
  fromDatabaseError,
  ok,
  type ActionResult,
} from "@/lib/framing/result";
import { parseEurosToCents } from "@/lib/projects/schemas";
import { createClient } from "@/lib/supabase/server";

// Answers to the questions of the Cadrage intelligent (docs/ARCHITECTURE.md
// § 6). Every answer appends a Brief row (history kept); the database
// decides who writes and which dimension is open (framing_dimension_editable).

const projectId_ = z.uuid();

async function appendRow(
  projectId: string,
  key: string,
  row: BriefRow,
): Promise<ActionResult> {
  const access = await requireApproved();
  if (!access.organizationId || !projectId_.safeParse(projectId).success)
    return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.from("field_values").insert({
    organization_id: access.organizationId,
    project_id: projectId,
    deliverable: "brief",
    field_key: key,
    ...row,
    value: row.value as never,
  });
  return finish(projectId, error);
}

async function finish(
  projectId: string,
  error: { code?: string; message?: string } | null,
): Promise<ActionResult> {
  // A dimension closed by RLS: the Cadrage is with the validator, validated,
  // or the correction does not reopen it.
  if (error?.code === "42501") return fail("stage_locked");
  if (error) return fromDatabaseError(error);
  revalidatePath(routes.project(projectId), "layout");
  return ok;
}

const keyOf = (key: string, kinds: readonly string[]): QuestionKey | null =>
  isQuestionKey(key) && kinds.includes(QUESTIONS[key].kind) ? key : null;

/** « Écrire moi-même » for a sentence. */
export async function answerText(
  projectId: string,
  key: string,
  text: string,
): Promise<ActionResult> {
  const question = keyOf(key, ["text"]);
  const value = z.string().trim().min(1).max(2000).safeParse(text);
  if (!question || !value.success) return fail("invalid_input");
  return appendRow(projectId, question, {
    value: value.data,
    status: "confirmed",
    source_type: "manual",
  });
}

/** A date chosen by a person (never parsed by PO). */
export async function answerDate(
  projectId: string,
  key: string,
  date: string,
): Promise<ActionResult> {
  const question = keyOf(key, ["date"]);
  if (!question || !z.iso.date().safeParse(date).success)
    return fail("invalid_input");
  return appendRow(projectId, question, {
    value: date,
    status: "confirmed",
    source_type: "manual",
  });
}

/** An amount typed in euros, stored in cents. */
export async function answerMoney(
  projectId: string,
  key: string,
  amount: string,
): Promise<ActionResult> {
  const question = keyOf(key, ["money"]);
  const cents = parseEurosToCents(amount);
  if (!question || typeof cents !== "number") return fail("invalid_input");
  return appendRow(projectId, question, {
    value: cents,
    status: "confirmed",
    source_type: "manual",
  });
}

/** « Rien à signaler »: a valid answer where the question allows it. */
export async function answerNone(
  projectId: string,
  key: string,
): Promise<ActionResult> {
  if (!isQuestionKey(key) || !QUESTIONS[key].allowNone)
    return fail("invalid_input");
  return appendRow(projectId, key, {
    value: { none: true },
    status: "confirmed",
    source_type: "manual",
  });
}

/**
 * « Écarter » / « Passer »: the question is set aside (a rejected row), so a
 * value recorded elsewhere is not offered again. A required question stays
 * missing; the Brief waits for it.
 */
export async function dismissQuestion(
  projectId: string,
  key: string,
): Promise<ActionResult> {
  if (!isQuestionKey(key)) return fail("invalid_input");
  return appendRow(projectId, key, {
    value: { dismissed: true },
    status: "rejected",
    source_type: "manual",
  });
}

/**
 * « Confirmer »: what is proposed becomes known. Re-read on the server, never
 * taken from the client: a stored proposal keeps its source (call, dictation,
 * initial context); a value recorded elsewhere is written with where it came
 * from; proposed lines of a list are confirmed together.
 */
export async function confirmQuestion(
  projectId: string,
  key: string,
): Promise<ActionResult> {
  if (!isQuestionKey(key) || !projectId_.safeParse(projectId).success)
    return fail("invalid_input");
  const access = await requireApproved();
  const knowledge = await loadFramingKnowledge(projectId, access);
  if (!knowledge) return fail("not_found");
  const state = findQuestion(assessFraming(knowledge), key);
  if (state.status !== "to_confirm") return fail("invalid_transition");
  const kind = QUESTIONS[key].kind;

  if (kind === "text" || kind === "date" || kind === "money") {
    const row = confirmedRow(state, knowledge);
    return row ? appendRow(projectId, key, row) : fail("not_found");
  }
  const supabase = await createClient();
  const { error } = await confirmLines(supabase, projectId, key);
  return finish(projectId, error);
}

// Deadlines ------------------------------------------------------------------

const DEADLINE_KINDS = [
  "master_final",
  "delivery",
  "release",
  "promotion",
  "other",
] as const;

const deadlineInput = z.object({
  kind: z.enum(DEADLINE_KINDS),
  label: z
    .string()
    .trim()
    .max(200)
    .transform((v) => v || null),
  dueDate: z.iso.date(),
});

export async function addDeadline(
  projectId: string,
  input: z.input<typeof deadlineInput>,
): Promise<ActionResult> {
  const p = deadlineInput.safeParse(input);
  const access = await requireApproved();
  if (
    !p.success ||
    !access.organizationId ||
    !projectId_.safeParse(projectId).success ||
    (p.data.kind === "other" && !p.data.label)
  )
    return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.from("framing_deadlines").insert({
    organization_id: access.organizationId,
    project_id: projectId,
    kind: p.data.kind,
    label: p.data.label,
    due_date: p.data.dueDate,
  });
  return finish(projectId, error);
}

/** Corrects a deadline (a person picks its date: it is then confirmed). */
export async function updateDeadline(
  projectId: string,
  deadlineId: string,
  input: z.input<typeof deadlineInput>,
): Promise<ActionResult> {
  const p = deadlineInput.safeParse(input);
  if (
    !p.success ||
    !z.uuid().safeParse(deadlineId).success ||
    (p.data.kind === "other" && !p.data.label)
  )
    return fail("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase
    .from("framing_deadlines")
    .update({
      kind: p.data.kind,
      label: p.data.label,
      due_date: p.data.dueDate,
      review_status: "confirmed",
    })
    .eq("id", deadlineId)
    .eq("project_id", projectId);
  return finish(projectId, error);
}

export async function removeDeadline(
  projectId: string,
  deadlineId: string,
): Promise<ActionResult> {
  if (!z.uuid().safeParse(deadlineId).success) return fail("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase
    .from("framing_deadlines")
    .update({ review_status: "rejected" })
    .eq("id", deadlineId)
    .eq("project_id", projectId);
  return finish(projectId, error);
}
