"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { fail, type ActionResult } from "@/lib/framing/result";
import { done } from "@/lib/strategy/actions/shared";
import { importReportIntoStrategy } from "@/lib/strategy/import-report";
import { createClient } from "@/lib/supabase/server";

const input = z.object({ projectId: z.uuid(), reportId: z.uuid() });

/**
 * « Importer depuis un call »: the strategy items of a call report become
 * proposals (lib/strategy/import-report.ts), from any call of the project.
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

  const result = await importReportIntoStrategy(
    supabase,
    access.organizationId,
    projectId,
    reportId,
  );
  if (!result.ok) return result;
  return done(projectId, null);
}
