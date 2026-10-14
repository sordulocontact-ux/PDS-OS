"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { prepDone } from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";

// « Lien du prestataire » (PROD-026): the owner creates a provider's
// private link; the token comes back once and is never stored (only its
// hash, create_production_provider_link). A new link replaces the former.

const schema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  contactId: z.uuid(),
});

export async function createProviderLink(
  input: z.input<typeof schema>,
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  await requireApproved();
  const parsed = schema.safeParse(input);
  const t = fr.productionProvider;
  if (!parsed.success) return { ok: false, error: t.failed };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "create_production_provider_link",
    { p_sheet_id: parsed.data.sheetId, p_contact_id: parsed.data.contactId },
  );
  if (error || !data) {
    if (error?.message.includes("not_a_provider"))
      return { ok: false, error: t.notAProvider };
    console.error("createProviderLink:", error?.message);
    return { ok: false, error: t.failed };
  }
  prepDone(parsed.data.projectId);
  return { ok: true, token: data };
}
