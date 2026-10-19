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

const t = fr.productionPlace.replace;

const schema = z.object({
  projectId: z.uuid(),
  optionId: z.uuid(),
  names: z.object({ next: z.string().max(200), prev: z.string().max(200) }),
  reason: z.string().trim().min(1).max(1000),
  reviews: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(300),
        person_id: z.uuid().nullable(),
        contact_id: z.uuid().nullable(),
      }),
    )
    .max(10),
  reviseQuote: z.boolean(),
  reviseDirection: z.boolean(),
  noteIds: z.array(z.uuid()).max(20),
});

/** « Remplacer le lieu » (whoever organises): a new decision with its
 * reason, the former one kept; what to review becomes tasks. */
export async function replacePlace(
  input: z.input<typeof schema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return {
      ok: false,
      error: field === "reason" ? t.errors.reason : t.errors.place,
    };
  }
  const p = parsed.data;
  return withOutcome(
    p.projectId,
    ["marketing"],
    t.done(p.names.next, p.names.prev),
    async () => {
      const supabase = await createClient();
      const { error } = await supabase.rpc("replace_production_location", {
        p_option_id: p.optionId,
        p_reason: p.reason,
        p_reviews: p.reviews,
        p_revise_quote: p.reviseQuote,
        p_revise_direction: p.reviseDirection,
        p_note_ids: p.noteIds,
      });
      if (error) return prepFailure(error);
      await schedulePendingPushes();
      return prepDone(p.projectId);
    },
  );
}
