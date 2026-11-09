"use server";

import { z } from "zod";

import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import { run, type ClearanceResult } from "@/lib/legal/clearance/run";

const linkSchema = z.object({
  projectId: catalogIdSchema,
  holderId: catalogIdSchema,
  contactId: catalogIdSchema,
});

/** « Ajouter au Réseau » on a rights holder kept by name only (Sacha,
 * 09/11/2026): their new fiche linked to the borrowing; the address they
 * were e-mailed to goes to the fiche when it has none (SQL). */
export async function linkClearanceHolder(
  input: z.input<typeof linkSchema>,
): Promise<ClearanceResult> {
  const p = linkSchema.safeParse(input);
  if (!p.success) return { ok: false, error: fr.legalClearance.errors.failed };
  return run(p.data.projectId, (s) =>
    s.rpc("link_clearance_holder_contact", {
      p_holder_id: p.data.holderId,
      p_contact_id: p.data.contactId,
    }),
  );
}
