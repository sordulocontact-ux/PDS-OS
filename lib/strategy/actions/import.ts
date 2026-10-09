"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { fail, type ActionResult } from "@/lib/framing/result";
import { done } from "@/lib/strategy/actions/shared";
import { importStrategyItems } from "@/lib/strategy/import-call";
import { createClient } from "@/lib/supabase/server";

const input = z.object({ projectId: z.uuid(), reportId: z.uuid() });

/**
 * « Importer depuis un call »: the strategy items of any report of the
 * project become proposals (lib/strategy/import-call.ts). A strategy
 * exchange is imported on its own once its report is saved.
 */
export async function importStrategyReport(
  projectId: string,
  reportId: string,
): Promise<ActionResult> {
  const parsed = input.safeParse({ projectId, reportId });
  if (!parsed.success) return fail("invalid_input");
  const access = await requireApproved();
  const supabase = await createClient();

  const { data: report } = await supabase
    .from("call_reports")
    .select("id, calls!inner(project_id)")
    .eq("id", reportId)
    .eq("calls.project_id", projectId)
    .maybeSingle();
  if (!report || !access.organizationId) return fail("not_found");

  const result = await importStrategyItems(
    supabase,
    access.organizationId,
    projectId,
    reportId,
  );
  return result.ok ? done(projectId, null) : result;
}
