"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { routes } from "@/lib/auth/redirects";
import {
  fail,
  fromDatabaseError,
  ok,
  type ActionResult,
} from "@/lib/framing/result";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { loadFollowUp } from "@/lib/strategy/follow-up-data";
import { loadStrategyPage } from "@/lib/strategy/page-data";
import { shiftDate } from "@/lib/strategy/upstream";
import { createClient } from "@/lib/supabase/server";

const input = z.object({
  projectId: z.uuid(),
  ruleKey: z.string().regex(/^[a-z0-9_:-]{1,120}$/),
});

// A task created from a recommendation is due a week later (code, rule 6).
const TASK_DAYS = 7;

async function settle(
  projectId: string,
  error: { code?: string; message?: string } | null,
) {
  if (error) return fromDatabaseError(error);
  revalidatePath(routes.projectStrategyFollowUp(projectId));
  return ok;
}

/**
 * « Appliquer »: the recommendation is computed again here from the data
 * (never taken from the browser) and becomes a task for the project's
 * owner, in the project's Travail; it is then not offered again.
 */
export async function applyRecommendation(
  projectId: string,
  ruleKey: string,
): Promise<ActionResult> {
  const p = input.safeParse({ projectId, ruleKey });
  if (!p.success) return fail("invalid_input");
  const page = await loadStrategyPage(projectId);
  const organizationId = page.access.organizationId;
  const owner = page.project.ownerPersonId;
  if (!page.canEdit || !organizationId || !owner) return fail("forbidden");
  const { recommendations, today } = await loadFollowUp(page);
  const rec = recommendations.find((r) => r.ruleKey === p.data.ruleKey);
  if (!rec) return fail("not_found");

  const supabase = await createClient();
  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      organization_id: organizationId,
      project_id: projectId,
      title: rec.action,
      assignee_person_id: owner,
      due_date: shiftDate(today, TASK_DAYS),
    })
    .select("id")
    .single();
  if (error || !task) return fromDatabaseError(error);
  const { error: recError } = await supabase
    .from("strategy_recommendations")
    .insert({
      organization_id: organizationId,
      project_id: projectId,
      rule_key: rec.ruleKey,
      state: "applied",
      task_id: task.id,
    });
  await schedulePendingPushes();
  revalidatePath(routes.projectWork(projectId));
  return settle(projectId, recError);
}

/** « Ignorer »: the recommendation is not offered again. */
export async function ignoreRecommendation(
  projectId: string,
  ruleKey: string,
): Promise<ActionResult> {
  const p = input.safeParse({ projectId, ruleKey });
  if (!p.success) return fail("invalid_input");
  const page = await loadStrategyPage(projectId);
  const organizationId = page.access.organizationId;
  if (!page.canEdit || !organizationId) return fail("forbidden");
  const supabase = await createClient();
  const { error } = await supabase.from("strategy_recommendations").insert({
    organization_id: organizationId,
    project_id: projectId,
    rule_key: p.data.ruleKey,
    state: "ignored",
  });
  return settle(projectId, error);
}
