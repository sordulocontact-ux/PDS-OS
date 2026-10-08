"use server";

import { z } from "zod";

import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import {
  CLEARANCE_EXCEPTIONS,
  CLEARANCE_PATH,
} from "@/lib/legal/clearance/matrix";
import { run } from "@/lib/legal/clearance/run";

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
  return run(p.data.projectId, (s) =>
    s.rpc("advance_clearance", {
      p_clearance_id: p.data.clearanceId,
      p_status: p.data.status,
      p_note: p.data.note || null,
    }),
  );
}
