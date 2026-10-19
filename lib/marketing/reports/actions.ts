"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import { RULES_VERSION } from "@/lib/marketing/dashboard";
import {
  REPORT_SECTIONS,
  RESERVE_CATEGORIES,
} from "@/lib/marketing/reports/model";
import { marketingFailure } from "@/lib/marketing/result";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// « Générer la version N » (ticket « Suivi & bilan », écran 2, step « Bilan
// provisoire »): the scope, the period, the sections and the reserves kept
// come from the preparation; the snapshot itself is built by the database
// from the tables, never sent from here. The rules version is the code's
// own. The period is asked (proto: « Du * », « Au * »), the summary too.

const e = fr.marketing.errors;
const r = fr.marketingReview.reports.errors;

const input = z.object({
  projectId: z.uuid(),
  activationIds: z.array(z.uuid()).min(1).max(500),
  periodStart: z.iso.date(),
  periodEnd: z.iso.date(),
  sections: z.array(z.enum(REPORT_SECTIONS)).min(1).max(8),
  summary: z.string().trim().min(1).max(5000),
  recommendations: z.string().trim().max(5000),
  reserves: z
    .array(
      z.object({
        category: z.enum(RESERVE_CATEGORIES),
        description: z.string().trim().min(1).max(1000),
        activationId: z.union([z.uuid(), z.literal("")]),
      }),
    )
    .max(30),
});

export async function generateReport(
  raw: z.input<typeof input>,
  version: number,
): Promise<WriteResult> {
  const p = input.safeParse(raw);
  if (!p.success) return { ok: false, error: e.invalid };
  const d = p.data;
  if (d.periodEnd < d.periodStart) return { ok: false, error: r.period };
  await requireApproved();
  const supabase = await createClient();
  return withOutcome(
    d.projectId,
    ["marketing"],
    fr.reviewJourney.bilan.generated(version),
    () => write(supabase, d),
  );
}

async function write(
  supabase: Awaited<ReturnType<typeof createClient>>,
  d: z.output<typeof input>,
): Promise<WriteResult> {
  const { error } = await supabase.rpc("generate_marketing_report", {
    p_project_id: d.projectId,
    p_activation_ids: d.activationIds,
    p_period_start: d.periodStart,
    p_period_end: d.periodEnd,
    p_sections: d.sections,
    p_summary: d.summary,
    p_recommendations: d.recommendations,
    p_reserves: d.reserves.map((reserve) => ({
      category: reserve.category,
      description: reserve.description,
      activation_id: reserve.activationId,
    })),
    p_rules_version: RULES_VERSION,
  });
  if (error) {
    if (error.message.includes("invalid_scope"))
      return { ok: false, error: r.scope };
    const failure = marketingFailure(error);
    return failure.ok ? { ok: false, error: e.generic } : failure;
  }
  revalidatePath(routes.projectReview(d.projectId), "layout");
  return { ok: true };
}
