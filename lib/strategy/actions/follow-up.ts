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
import { loadFollowUp } from "@/lib/strategy/follow-up-data";
import { loadStrategy } from "@/lib/strategy/queries";
import { createClient } from "@/lib/supabase/server";

// Follow-up actions of the Stratégie (ticket § 14), owner only; RLS decides
// again. A recommendation is always recomputed here from the data, never
// taken from the browser.

const ruleKey = z.string().regex(/^[a-z0-9_:-]{1,120}$/);

const applyInput = z.object({
  projectId: z.uuid(),
  ruleKey,
  title: z.string().trim().min(1).max(300),
  assigneeId: z.uuid(),
  dueOn: z.iso.date(),
});

const ignoreInput = z.object({
  projectId: z.uuid(),
  ruleKey,
  reason: z.string().trim().min(1).max(1000),
});

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

/** The recommendation as the code computes it now, never the browser's. */
async function currentRecommendation(
  ctx: NonNullable<Awaited<ReturnType<typeof ownerContext>>>,
  projectId: string,
  key: string,
) {
  const data = await loadStrategy(projectId, ctx.access);
  if (!data) return null;
  const followUp = await loadFollowUp(projectId, ctx.project.title, data);
  return followUp.recommendations.find((r) => r.ruleKey === key) ?? null;
}

/**
 * « Créer la tâche » (MKT-C2-02): the recommendation becomes a task of the
 * Travail, its title, assignee and due date prefilled by the code and
 * corrected by the owner. One function writes both, once: replaying it
 * returns the same task (apply_strategy_recommendation).
 */
export async function applyRecommendation(input: {
  projectId: string;
  ruleKey: string;
  title: string;
  assigneeId: string;
  dueOn: string;
}): Promise<ActionResult> {
  const p = applyInput.safeParse(input);
  if (!p.success) return fail("invalid_input");
  const ctx = await ownerContext(p.data.projectId);
  if (!ctx) return fail("forbidden");
  const rec = await currentRecommendation(
    ctx,
    p.data.projectId,
    p.data.ruleKey,
  );
  if (!rec) return fail("not_found");

  const supabase = await createClient();
  const { error } = await supabase.rpc("apply_strategy_recommendation", {
    p_project_id: p.data.projectId,
    p_rule_key: rec.ruleKey,
    p_level: rec.level,
    p_summary: rec.text,
    p_title: p.data.title,
    p_assignee: p.data.assigneeId,
    p_due_on: p.data.dueOn,
  });
  if (error) return fromDatabaseError(error);
  await schedulePendingPushes();
  revalidatePath(routes.projectWork(p.data.projectId));
  return done(p.data.projectId, null);
}

/** « Ignorer »: not offered again, with the reason, kept with what it said. */
export async function ignoreRecommendation(input: {
  projectId: string;
  ruleKey: string;
  reason: string;
}): Promise<ActionResult> {
  const p = ignoreInput.safeParse(input);
  if (!p.success) return fail("reason_required");
  const ctx = await ownerContext(p.data.projectId);
  if (!ctx) return fail("forbidden");
  const rec = await currentRecommendation(
    ctx,
    p.data.projectId,
    p.data.ruleKey,
  );
  if (!rec) return fail("not_found");
  const supabase = await createClient();
  const { error } = await supabase.from("strategy_recommendations").insert({
    organization_id: ctx.organizationId,
    project_id: p.data.projectId,
    rule_key: rec.ruleKey,
    state: "ignored",
    level: rec.level,
    summary: rec.text,
    reason: p.data.reason,
  });
  return done(p.data.projectId, error);
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
