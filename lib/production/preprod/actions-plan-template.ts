"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";
import { effectiveLogistics } from "@/lib/production/logistics";
import { prepDone, type PrepResult } from "@/lib/production/prep-result";
import { loadProductionSheet } from "@/lib/production/sheet";
import { preprodFor } from "@/lib/production/tab-data";
import { formatDate } from "@/lib/release/format";
import { createClient } from "@/lib/supabase/server";

import { proposePlan, reschedulePlan } from "./plan-template";
import { dueByStep } from "./schedule";
import { forbidden, invalid, nextPosition, preprodFailure } from "./result";

// « Proposer un plan » and « Recalculer les échéances » (PROD-006,
// PROD-010): recomputed here from the sheet — never sent by the client —
// and written with the owner's rights (the plan's RLS).

const schema = z.object({ projectId: z.uuid(), deliverableId: z.uuid() });

async function context(input: z.input<typeof schema>) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return null;
  const { projectId, deliverableId } = parsed.data;
  const access = await requireApproved();
  const data = await loadProductionSheet(projectId, deliverableId, access);
  if (!data?.sheet || !data.canOrganize) return null;
  const preprod = await preprodFor(projectId, deliverableId, access);
  if (!preprod) return null;
  const today = todayInParis();
  const due = dueByStep(
    effectiveLogistics(data.sheet.logistics, data.heritage.fiche),
    today,
  );
  return { projectId, data, sheet: data.sheet, preprod, today, due };
}

/** The usual steps not in the plan yet, as drafts with their dates,
 * dependencies and proposed holder; nothing approved. */
export async function proposePlanActions(
  input: z.input<typeof schema>,
): Promise<PrepResult & { count?: number }> {
  const c = await context(input);
  if (!c) return forbidden;
  const { sheet, preprod } = c;
  const existing = new Set(
    preprod.actions.flatMap((a) => (a.templateKey ? [a.templateKey] : [])),
  );
  const proposed = proposePlan({
    brief: sheet.brief,
    due: c.due,
    today: c.today,
    existing,
    hasDirector: sheet.director !== null,
  });
  if (proposed.length === 0) return prepDone(c.projectId);

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("owner_person_id, organization_id")
    .eq("id", c.projectId)
    .maybeSingle();
  if (!project) return invalid;
  const director = sheet.director;
  const start = await nextPosition(
    supabase,
    "production_plan_actions",
    sheet.id,
  );
  const t = fr.productionPreprod.plan.template;
  const { data: rows, error } = await supabase
    .from("production_plan_actions")
    .insert(
      proposed.map((p, index) => ({
        organization_id: project.organization_id,
        project_id: c.projectId,
        sheet_id: sheet.id,
        template_key: p.key,
        title: p.title,
        due_date: p.dueDate,
        blocking: p.blocking,
        note: p.pastDate ? t.pastNote(formatDate(p.pastDate)) : null,
        person_id:
          p.holder === "director"
            ? director?.kind === "person"
              ? director.id
              : null
            : project.owner_person_id,
        contact_id:
          p.holder === "director" && director?.kind === "contact"
            ? director.id
            : null,
        position: start + index,
      })),
    )
    .select("id, template_key");
  if (error) return preprodFailure(error);

  // Dependencies, by key, among the plan's proposed actions.
  const idOf = new Map<string, string>([
    ...preprod.actions.flatMap((a) =>
      a.templateKey ? [[a.templateKey, a.id] as const] : [],
    ),
    ...(rows ?? []).flatMap((r) =>
      r.template_key ? [[r.template_key, r.id] as const] : [],
    ),
  ]);
  for (const p of proposed) {
    const id = idOf.get(p.key);
    const dependsOn = p.dependsOn.flatMap((k) => idOf.get(k) ?? []);
    if (!id || dependsOn.length === 0) continue;
    const { error: depError } = await supabase
      .from("production_plan_actions")
      .update({ depends_on: dependsOn })
      .eq("id", id);
    if (depError) return preprodFailure(depError);
  }
  prepDone(c.projectId);
  return { ok: true, count: proposed.length };
}

/** « Appliquer ces échéances », after the preview (PROD-010). */
export async function applyPlanReschedule(
  input: z.input<typeof schema>,
): Promise<PrepResult> {
  const c = await context(input);
  if (!c) return forbidden;
  const changes = reschedulePlan({
    actions: c.preprod.actions,
    due: c.due,
    today: c.today,
  });
  const supabase = await createClient();
  for (const change of changes) {
    const { error } = await supabase
      .from("production_plan_actions")
      .update({ due_date: change.to })
      .eq("id", change.actionId)
      .eq("sheet_id", c.sheet.id);
    if (error) return preprodFailure(error);
  }
  return prepDone(c.projectId);
}
