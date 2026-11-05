"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { storedValue, type BriefRow } from "@/lib/framing/confirm";
import {
  ITEM_STATES,
  MAX_MEASURES,
  QUESTIONS,
  isQuestionKey,
  type QuestionKey,
} from "@/lib/framing/dimensions";
import {
  fail,
  fromDatabaseError,
  ok,
  type ActionResult,
} from "@/lib/framing/result";
import { parseEurosToCents } from "@/lib/projects/schemas";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { createClient } from "@/lib/supabase/server";

// Structured answers of the Cadrage (PROJ-UX-04, UX-05): a measurable
// objective, several items each with its state, an envelope confirmed or
// estimated, « Non applicable » with its reason, « À définir plus tard »
// with a follow-up task. Each appends a Brief row (history kept) under RLS.

const projectId_ = z.uuid();

async function append(
  projectId: string,
  key: QuestionKey,
  value: unknown,
  // Structuring a proposal keeps where it came from (a call, the context).
  keepSource: boolean,
): Promise<ActionResult> {
  const access = await requireApproved();
  if (!access.organizationId || !projectId_.safeParse(projectId).success)
    return fail("invalid_input");
  const supabase = await createClient();
  let source: Omit<BriefRow, "value" | "status"> = { source_type: "manual" };
  if (keepSource) {
    const { data: current } = await supabase
      .from("current_field_values")
      .select(
        "status, source_type, source_report_item_id, source_quote, source_start_seconds, source_label",
      )
      .eq("project_id", projectId)
      .eq("deliverable", "brief")
      .eq("field_key", key)
      .maybeSingle();
    if (current?.status === "proposed" && current.source_type !== "suggestion")
      source = {
        source_type: current.source_type as BriefRow["source_type"],
        source_report_item_id: current.source_report_item_id,
        source_quote: current.source_quote,
        source_start_seconds: current.source_start_seconds,
        source_label: current.source_label,
      };
  }
  const { error } = await supabase.from("field_values").insert({
    organization_id: access.organizationId,
    project_id: projectId,
    deliverable: "brief",
    field_key: key,
    value: value as never,
    status: "confirmed",
    ...source,
  });
  if (error?.code === "42501") return fail("stage_locked");
  if (error) return fromDatabaseError(error);
  revalidatePath(routes.project(projectId), "layout");
  return ok;
}

const shaped = (key: string, shape: "items" | "measure") =>
  isQuestionKey(key) && QUESTIONS[key].shape === shape ? key : null;

const itemsInput = z
  .array(
    z.object({
      label: z.string().trim().min(1).max(200),
      state: z.enum(ITEM_STATES),
    }),
  )
  .min(1)
  .max(30);

/** Several items, each with its state (prerequisites, work started…). */
export async function answerItems(
  projectId: string,
  key: string,
  items: z.input<typeof itemsInput>,
  keepSource = false,
): Promise<ActionResult> {
  const question = shaped(key, "items");
  const p = itemsInput.safeParse(items);
  if (!question || !p.success) return fail("invalid_input");
  // The same item once (PROJ-BUG-03: no duplicate in a section).
  const seen = new Set<string>();
  const unique = p.data.filter((i) => {
    const k = i.label.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return append(
    projectId,
    question,
    storedValue({ kind: "text", text: "", items: unique }),
    keepSource,
  );
}

const measuresInput = z
  .array(
    z.object({
      metric: z.string().trim().min(1).max(100),
      target: z.number().finite().nonnegative(),
      period: z.string().trim().min(1).max(100),
      source: z
        .string()
        .trim()
        .max(100)
        .transform((v) => v || null),
    }),
  )
  .min(1)
  .max(MAX_MEASURES);

/**
 * Measurable objectives, one or several (Ibé 01/11/2026: streams, views,
 * followers…): metric, target and horizon are all required for each.
 */
export async function answerMeasures(
  projectId: string,
  key: string,
  measures: z.input<typeof measuresInput>,
  keepSource = false,
): Promise<ActionResult> {
  const question = shaped(key, "measure");
  const p = measuresInput.safeParse(measures);
  if (!question || !p.success) return fail("invalid_input");
  return append(
    projectId,
    question,
    storedValue({ kind: "text", text: "", measures: p.data }),
    keepSource,
  );
}

/** The envelope, said confirmed or only estimated. */
export async function answerEnvelope(
  projectId: string,
  key: string,
  amount: string,
  certainty: "confirmed" | "estimated",
): Promise<ActionResult> {
  const cents = parseEurosToCents(amount);
  if (
    !isQuestionKey(key) ||
    QUESTIONS[key].kind !== "money" ||
    typeof cents !== "number" ||
    !["confirmed", "estimated"].includes(certainty)
  )
    return fail("invalid_input");
  return append(
    projectId,
    key,
    storedValue({ kind: "money", cents, certainty }),
    false,
  );
}

/** « Non applicable »: always with its reason. */
export async function answerNotApplicable(
  projectId: string,
  key: string,
  reason: string,
): Promise<ActionResult> {
  const r = z.string().trim().min(1).max(300).safeParse(reason);
  if (!isQuestionKey(key) || !r.success) return fail("reason_required");
  return append(projectId, key, { na: true, reason: r.data }, false);
}

/**
 * « À définir plus tard »: a follow-up task for the project's owner (who
 * answers here) before the chosen date, then the answer that points to it.
 */
export async function answerLater(
  projectId: string,
  key: string,
  due: string,
  label: string,
): Promise<ActionResult> {
  if (
    !isQuestionKey(key) ||
    !z.iso.date().safeParse(due).success ||
    !projectId_.safeParse(projectId).success
  )
    return fail("invalid_input");
  const access = await requireApproved();
  if (!access.organizationId || !access.personId) return fail("invalid_input");
  const supabase = await createClient();
  // Checked before the task exists: a task cannot be removed afterwards.
  const { data: open } = await supabase.rpc("framing_dimension_editable", {
    p_project_id: projectId,
    p_dimension: QUESTIONS[key].dimension,
  });
  if (open !== true) return fail("stage_locked");
  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      organization_id: access.organizationId,
      project_id: projectId,
      title: label.trim().slice(0, 200),
      assignee_person_id: access.personId,
      due_date: due,
    })
    .select("id")
    .single();
  if (error || !task) return fromDatabaseError(error ?? { message: "task" });
  const answered = await append(
    projectId,
    key,
    { later: true, due, taskId: task.id },
    false,
  );
  await schedulePendingPushes();
  return answered;
}
