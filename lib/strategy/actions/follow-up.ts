"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  fail,
  fromDatabaseError,
  ok,
  type ActionResult,
} from "@/lib/framing/result";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { canEditProject } from "@/lib/projects/edit-access";
import { getProject } from "@/lib/projects/queries";
import { addDays } from "@/lib/strategy/calendar";
import { loadFollowUp } from "@/lib/strategy/follow-up-data";
import { loadStrategy } from "@/lib/strategy/queries";
import { createClient } from "@/lib/supabase/server";

// Follow-up actions of the Stratégie (ticket § 14), owner only; RLS decides
// again. A recommendation is always recomputed here from the data, never
// taken from the browser.

const ruleInput = z.object({
  projectId: z.uuid(),
  ruleKey: z.string().regex(/^[a-z0-9_:-]{1,120}$/),
});

// A task made from a recommendation is due a week later (code, rule 6).
const TASK_DAYS = 7;

async function ownerContext(projectId: string) {
  const access = await requireApproved();
  const project = await getProject(projectId);
  if (
    !project ||
    !access.organizationId ||
    !project.ownerPersonId ||
    !canEditProject(access, project)
  )
    return null;
  return {
    access,
    project,
    organizationId: access.organizationId,
    owner: project.ownerPersonId,
  };
}

function done(
  projectId: string,
  error: { code?: string; message?: string } | null,
) {
  if (error) return fromDatabaseError(error);
  revalidatePath(routes.projectStrategyFollowUp(projectId));
  return ok;
}

/** « Appliquer »: the recommendation becomes a task for the project's owner. */
export async function applyRecommendation(
  projectId: string,
  ruleKey: string,
): Promise<ActionResult> {
  const p = ruleInput.safeParse({ projectId, ruleKey });
  if (!p.success) return fail("invalid_input");
  const ctx = await ownerContext(projectId);
  if (!ctx) return fail("forbidden");
  const data = await loadStrategy(projectId, ctx.access);
  if (!data) return fail("not_found");
  const followUp = await loadFollowUp(projectId, ctx.project.title, data);
  const rec = followUp.recommendations.find(
    (r) => r.ruleKey === p.data.ruleKey,
  );
  if (!rec) return fail("not_found");

  const supabase = await createClient();
  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      organization_id: ctx.organizationId,
      project_id: projectId,
      title: rec.action,
      assignee_person_id: ctx.owner,
      due_date: addDays(followUp.today, TASK_DAYS),
    })
    .select("id")
    .single();
  if (error || !task) return fromDatabaseError(error);
  const { error: recError } = await supabase
    .from("strategy_recommendations")
    .insert({
      organization_id: ctx.organizationId,
      project_id: projectId,
      rule_key: rec.ruleKey,
      state: "applied",
      task_id: task.id,
    });
  await schedulePendingPushes();
  revalidatePath(routes.projectWork(projectId));
  return done(projectId, recError);
}

/** « Ignorer »: the recommendation is not offered again. */
export async function ignoreRecommendation(
  projectId: string,
  ruleKey: string,
): Promise<ActionResult> {
  const p = ruleInput.safeParse({ projectId, ruleKey });
  if (!p.success) return fail("invalid_input");
  const ctx = await ownerContext(projectId);
  if (!ctx) return fail("forbidden");
  const supabase = await createClient();
  const { error } = await supabase.from("strategy_recommendations").insert({
    organization_id: ctx.organizationId,
    project_id: projectId,
    rule_key: p.data.ruleKey,
    state: "ignored",
  });
  return done(projectId, error);
}

// "12 500", "12500,5": the figure as typed, French decimal comma allowed.
const figure = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s/g, "").replace(",", "."))
  .refine((v) => /^\d{1,12}(\.\d{1,2})?$/.test(v))
  .transform(Number);

const measureInput = z.object({
  projectId: z.uuid(),
  objectiveId: z.uuid(),
  value: figure,
  measuredOn: z.iso.date(),
  source: z
    .string()
    .trim()
    .max(200)
    .transform((v) => v || null),
});

/**
 * « Noter une valeur »: a KPI's value really read somewhere, typed by the
 * owner with its date and where it was read. Never in the future.
 */
export async function noteKpiMeasure(input: {
  projectId: string;
  objectiveId: string;
  value: string;
  measuredOn: string;
  source: string;
}): Promise<ActionResult> {
  const p = measureInput.safeParse(input);
  if (!p.success) return fail("invalid_input");
  const ctx = await ownerContext(p.data.projectId);
  if (!ctx) return fail("forbidden");
  const supabase = await createClient();
  const { error } = await supabase.from("strategy_kpi_measures").insert({
    organization_id: ctx.organizationId,
    project_id: p.data.projectId,
    objective_id: p.data.objectiveId,
    value: p.data.value,
    measured_on: p.data.measuredOn,
    source_note: p.data.source,
  });
  return done(p.data.projectId, error);
}
