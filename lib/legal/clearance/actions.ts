"use server";

import { z } from "zod";

import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import {
  CLEARANCE_EXCEPTIONS,
  CLEARANCE_PATH,
} from "@/lib/legal/clearance/matrix";
import { run } from "@/lib/legal/clearance/run";
import { legalOutcome } from "@/lib/legal/outcome";
import { addLegalPlanItems } from "@/lib/legal/plan/actions";
import { schedulePendingPushes } from "@/lib/notifications/push";

const ids = { projectId: catalogIdSchema, clearanceId: catalogIdSchema };

// The project's side of a clearance (ticket Juridique 05). Every write is a
// SQL function that checks manage_legal and what each state needs. The
// panel's three moments chain them in flow-actions.ts.

export async function removeRightsholder(projectId: string, holderId: string) {
  const p = z
    .object({ projectId: catalogIdSchema, holderId: catalogIdSchema })
    .safeParse({ projectId, holderId });
  if (!p.success)
    return { ok: false as const, error: fr.auth.errors.forbidden };
  return run(p.data.projectId, (s) =>
    s.rpc("remove_clearance_rightsholder", {
      p_rightsholder_id: p.data.holderId,
    }),
  );
}

const advanceSchema = z.object({
  ...ids,
  status: z.enum([...CLEARANCE_PATH, ...CLEARANCE_EXCEPTIONS]),
  note: z.string().trim().max(2000),
});
export async function advanceClearance(input: z.input<typeof advanceSchema>) {
  const p = advanceSchema.safeParse(input);
  if (!p.success)
    return { ok: false as const, error: fr.legalClearance.errors.failed };
  return legalOutcome(
    p.data.projectId,
    fr.legalJourney.done.clearance.advanced,
    () =>
      run(p.data.projectId, (s) =>
        s.rpc("advance_clearance", {
          p_clearance_id: p.data.clearanceId,
          p_status: p.data.status,
          p_note: p.data.note || null,
        }),
      ),
  );
}

const decideSchema = z.object({
  ...ids,
  text: z.string().trim().min(1).max(1000),
});

/** « Retirer l'élément du titre », with why: the borrowing no longer blocks
 * the release, and whoever answers for the project is told (the Master
 * redoes the passage without it). */
export async function withdrawClearance(input: z.input<typeof decideSchema>) {
  const p = decideSchema.safeParse(input);
  if (!p.success)
    return { ok: false as const, error: fr.legalClearance.errors.note };
  return legalOutcome(
    p.data.projectId,
    fr.legalJourney.done.clearance.withdrawn,
    async () => {
      const result = await run(p.data.projectId, (s) =>
        s.rpc("withdraw_clearance", {
          p_clearance_id: p.data.clearanceId,
          p_reason: p.data.text,
        }),
      );
      if (result.ok) await schedulePendingPushes();
      return result;
    },
  );
}

/** « Remplacer et redemander »: a new borrowing for what replaces the
 * element, added to the plan at once (a new démarche of the Suivi). */
export async function replaceClearance(input: z.input<typeof decideSchema>) {
  const p = decideSchema.safeParse(input);
  if (!p.success)
    return { ok: false as const, error: fr.legalClearance.errors.note };
  return legalOutcome(
    p.data.projectId,
    fr.legalJourney.done.clearance.replaced,
    async () => {
      const result = await run(p.data.projectId, (s) =>
        s.rpc("replace_clearance", {
          p_clearance_id: p.data.clearanceId,
          p_what: p.data.text,
        }),
      );
      if (result.ok) await addLegalPlanItems(p.data.projectId);
      return result;
    },
  );
}
