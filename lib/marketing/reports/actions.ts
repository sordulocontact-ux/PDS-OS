"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { RULES_VERSION } from "@/lib/marketing/dashboard";
import {
  REPORT_SECTIONS,
  RESERVE_CATEGORIES,
} from "@/lib/marketing/reports/model";
import { marketingFailure } from "@/lib/marketing/result";
import { createClient } from "@/lib/supabase/server";

// « Générer le rapport » (ticket « Suivi & bilan », écran 2): the scope, the
// period, the sections and the reserves kept come from the preparation; the
// snapshot itself is built by the database from the tables, never sent from
// here. The rules version is the code's own.

const e = fr.marketing.errors;
const r = fr.marketingReview.reports.errors;

const optionalDate = z
  .union([z.iso.date(), z.literal("")])
  .transform((v) => v || null);

const input = z.object({
  projectId: z.uuid(),
  activationIds: z.array(z.uuid()).min(1).max(500),
  periodStart: optionalDate,
  periodEnd: optionalDate,
  sections: z.array(z.enum(REPORT_SECTIONS)).min(1).max(8),
  summary: z.string().trim().max(5000),
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

export type GenerateOutcome =
  { ok: true; reportId: string } | { ok: false; error: string };

export async function generateReport(
  raw: z.input<typeof input>,
): Promise<GenerateOutcome> {
  const p = input.safeParse(raw);
  if (!p.success) return { ok: false, error: e.invalid };
  const d = p.data;
  if (d.periodStart && d.periodEnd && d.periodEnd < d.periodStart)
    return { ok: false, error: r.period };
  await requireApproved();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_marketing_report", {
    p_project_id: d.projectId,
    p_activation_ids: d.activationIds,
    // Optional in SQL; the generated types cannot say a function argument is
    // nullable.
    p_period_start: d.periodStart as string,
    p_period_end: d.periodEnd as string,
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
  return { ok: true, reportId: data };
}
