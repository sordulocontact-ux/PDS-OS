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
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  projectId: z.uuid(),
  deliverableId: z.uuid(),
  reason: z.string().trim().max(1000),
});

/**
 * « Confirmer : préparation validée » (external, proto): the synthesis is
 * computed again on the server — never taken from the browser — then kept
 * as it is, with the reason when some lines are not ready.
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
  const [preprod, quotes, locations, tools] = await Promise.all([
    preprodFor(p.projectId, p.deliverableId, access),
    loadQuotes(sheet.id, data.members),
    loadLocations(sheet.id, data, access),
    loadStepTools(p.projectId),
  ]);
  if (!preprod) return { ok: false, error: fr.productionPrep.errors.notFound };
  const chosen = locations.options.find((o) => o.status === "chosen") ?? null;
  const rows = readySynthesis({
    data,
    preprod,
    quotes,
    place: chosen && { name: chosen.name, priceCents: chosen.priceCents },
    tools,
  });
  if (rows.some((r) => !r.ok) && !p.reason)
    return { ok: false, error: fr.productionReady.errors.reason };
  return withOutcome(
    p.projectId,
    ["marketing"],
    fr.productionReady.done,
    async () => {
      const supabase = await createClient();
      const { error } = await supabase.rpc("confirm_production_ready", {
        p_sheet_id: sheet.id,
        p_snapshot: rows,
        p_force_reason: p.reason || null,
      });
      return error ? prepFailure(error) : prepDone(p.projectId);
    },
  );
}
