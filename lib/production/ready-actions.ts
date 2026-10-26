"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import { journeyContext } from "@/lib/production/journey/context";
import {
  prepDone,
  prepFailure,
  type PrepResult,
} from "@/lib/production/prep-result";
import { loadLocations } from "@/lib/production/locations/queries";
import { loadQuotes } from "@/lib/production/quotes/queries";
import { readySynthesis } from "@/lib/production/ready-synthesis";
import { preprodFor } from "@/lib/production/tab-data";
import { loadStepTools } from "@/lib/step-tools/queries";
import { loadProposalVersions } from "@/lib/production/proposal/queries";
import { loadScheduleDecisions } from "@/lib/production/schedule/queries";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  projectId: z.uuid(),
  deliverableId: z.uuid(),
  reason: z.string().trim().max(1000),
  // The catch-up plan of the critical lines not ready (MKT-PROD-002).
  plan: z
    .array(
      z.object({
        key: z.string().max(40),
        personId: z.uuid(),
        dueOn: z.iso.date(),
      }),
    )
    .max(20)
    .default([]),
});

const decideSchema = z.object({
  projectId: z.uuid(),
  deliverableId: z.uuid(),
  approve: z.boolean(),
  reason: z.string().trim().max(1000),
});

/** The database's refusals of the confirmation and its decision. */
function readyFailure(error: { code?: string; message?: string }): PrepResult {
  const m = error.message ?? "";
  const e = fr.productionReady.errors;
  if (m.includes("plan_required")) return { ok: false, error: e.plan };
  if (m.includes("plan_due_past")) return { ok: false, error: e.planPast };
  if (m.includes("plan_person_invalid"))
    return { ok: false, error: e.planPerson };
  if (m.includes("request_pending")) return { ok: false, error: e.pending };
  if (m.includes("already_ready")) return { ok: false, error: e.already };
  if (m.includes("same_person")) return { ok: false, error: e.samePerson };
  if (m.includes("no_request")) return { ok: false, error: e.noRequest };
  if (m.includes("reason_required")) return { ok: false, error: e.reason };
  return prepFailure(error);
}

/**
 * « Confirmer : préparation validée » (external, proto): the synthesis is
 * computed again on the server — never taken from the browser — then kept
 * as it is, with the reason when some lines are not ready. A critical line
 * not ready makes it a request to the direction (recette 23/10, MKT-PROD-002).
 */
export async function confirmReady(
  input: z.input<typeof schema>,
): Promise<PrepResult> {
  const access = await requireApproved();
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: fr.productionPrep.errors.invalid };
  const p = parsed.data;
  const { data } = await journeyContext(p.projectId, p.deliverableId);
  const sheet = data.sheet;
  if (!sheet) return { ok: false, error: fr.productionPrep.errors.notFound };
  const [preprod, quotes, locations, tools, proposal, schedules] =
    await Promise.all([
      preprodFor(p.projectId, p.deliverableId, access),
      loadQuotes(sheet.id, data.members),
      loadLocations(sheet.id, data, access),
      loadStepTools(p.projectId),
      loadProposalVersions(sheet.id),
      loadScheduleDecisions(sheet.id),
    ]);
  if (!preprod) return { ok: false, error: fr.productionPrep.errors.notFound };
  const chosen = locations.options.find((o) => o.status === "chosen") ?? null;
  const rows = readySynthesis({
    data,
    preprod,
    quotes,
    place: chosen && { name: chosen.name, priceCents: chosen.priceCents },
    tools,
    proposal,
    schedule: schedules.find((x) => !x.replacedAt) ?? null,
  });
  if (rows.some((r) => !r.ok) && !p.reason)
    return { ok: false, error: fr.productionReady.errors.reason };
  // A critical line not ready: the confirmation becomes a request to the
  // direction, with its catch-up plan (checked again in SQL).
  const asks = rows.some((r) => !r.ok && r.critical);
  return withOutcome(
    p.projectId,
    ["marketing"],
    asks ? fr.productionReady.requested : fr.productionReady.done,
    async () => {
      const supabase = await createClient();
      const { error } = await supabase.rpc("confirm_production_ready", {
        p_sheet_id: sheet.id,
        p_snapshot: rows,
        p_force_reason: p.reason || null,
        p_plan: asks ? p.plan : null,
      });
      return error ? readyFailure(error) : prepDone(p.projectId);
    },
  );
}

/**
 * The direction (or the quote validator) decides a derogation before the
 * shoot (MKT-PROD-002): approved, the preparation is validated and the plan
 * becomes tasks; refused, with a reason. Never by who asked (SQL).
 */
export async function decideReady(
  input: z.input<typeof decideSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = decideSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: fr.productionPrep.errors.invalid };
  const p = parsed.data;
  if (!p.approve && !p.reason)
    return { ok: false, error: fr.productionReady.errors.refuseReason };
  const { data } = await journeyContext(p.projectId, p.deliverableId);
  const sheet = data.sheet;
  if (!sheet) return { ok: false, error: fr.productionPrep.errors.notFound };
  return withOutcome(
    p.projectId,
    ["marketing"],
    p.approve ? fr.productionReady.approved : fr.productionReady.refused,
    async () => {
      const supabase = await createClient();
      const { error } = await supabase.rpc("decide_production_ready", {
        p_sheet_id: sheet.id,
        p_approve: p.approve,
        p_reason: p.reason || undefined,
      });
      return error ? readyFailure(error) : prepDone(p.projectId);
    },
  );
}
