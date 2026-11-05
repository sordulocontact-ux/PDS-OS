"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import { legalOutcome } from "@/lib/legal/outcome";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// The gestures on a split confirmation's private link, kept visible in the
// step (proto « Projet complet », rule 19): « Marquer comme envoyé » (PDS OS
// does not send the e-mail) and « Révoquer l'accès » with why. Rights and
// states are checked by the SQL functions (20261020030201).

const ids = z.object({
  projectId: catalogIdSchema,
  confirmationId: catalogIdSchema,
});

export async function markSplitLinkSent(
  projectId: string,
  confirmationId: string,
): Promise<WriteResult> {
  const parsed = ids.safeParse({ projectId, confirmationId });
  await requireApproved();
  if (!parsed.success) return { ok: false, error: fr.auth.errors.forbidden };
  return legalOutcome(
    parsed.data.projectId,
    fr.legalDocuments.split.sent,
    async (): Promise<WriteResult> => {
      const supabase = await createClient();
      const { error } = await supabase.rpc("mark_split_confirmation_sent", {
        p_confirmation_id: parsed.data.confirmationId,
      });
      if (error) {
        console.error("markSplitLinkSent:", error.message);
        return { ok: false, error: fr.legalSplits.errors.failed };
      }
      revalidatePath(routes.projectLegal(parsed.data.projectId), "layout");
      return { ok: true, done: fr.legalDocuments.split.sent };
    },
  );
}

export async function revokeSplitLink(
  projectId: string,
  confirmationId: string,
  reason: string,
): Promise<WriteResult> {
  const why = reason.trim().slice(0, 1000);
  if (!why) return { ok: false, error: fr.legalForms.page.revokeWhyMissing };
  const parsed = ids.safeParse({ projectId, confirmationId });
  await requireApproved();
  if (!parsed.success) return { ok: false, error: fr.auth.errors.forbidden };
  return legalOutcome(
    parsed.data.projectId,
    fr.legalJourney.done.split.revoked,
    async (): Promise<WriteResult> => {
      const supabase = await createClient();
      const { error } = await supabase.rpc("revoke_split_confirmation", {
        p_confirmation_id: parsed.data.confirmationId,
        p_reason: why,
      });
      if (error) {
        console.error("revokeSplitLink:", error.message);
        return { ok: false, error: fr.legalSplits.errors.failed };
      }
      revalidatePath(routes.projectLegal(parsed.data.projectId), "layout");
      return { ok: true };
    },
  );
}
