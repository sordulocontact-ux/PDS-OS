"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import { schedulePendingPushes } from "@/lib/notifications/push";
import {
  prepDone,
  prepFailure,
  type PrepResult,
} from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";

import { SCHEDULE_SOURCES } from "./model";

const t = fr.productionSchedule;

const schema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  date: z.iso.date(),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
  source: z.enum(SCHEDULE_SOURCES),
  // A first decision or a change: the toast says which.
  change: z.boolean(),
});

/** « Valider la date et les horaires » (the project's owner): a new
 * decision replaces the previous one, which stays in the history. */
export async function decideSchedule(
  input: z.input<typeof schema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: fr.productionPrep.errors.invalid };
  const p = parsed.data;
  if (p.end <= p.start) return { ok: false, error: t.errors.end_before_start };
  const supabase = await createClient();
  return withOutcome(
    p.projectId,
    ["marketing"],
    p.change ? t.changed : t.decided,
    async () => {
      const { error } = await supabase.rpc("decide_production_schedule", {
        p_sheet_id: p.sheetId,
        p_date: p.date,
        p_start: p.start,
        p_end: p.end,
        p_source: p.source,
      });
      if (error) {
        const key = (Object.keys(t.errors) as (keyof typeof t.errors)[]).find(
          (k) => error.message?.includes(k),
        );
        return key ? { ok: false, error: t.errors[key] } : prepFailure(error);
      }
      await schedulePendingPushes();
      return prepDone(p.projectId);
    },
  );
}
