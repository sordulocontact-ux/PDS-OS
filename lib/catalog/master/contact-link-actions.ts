"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// A person is credited a few times in a project, never more than this.
const MAX_LINKS = 50;

const linkSchema = z.object({
  contactId: catalogIdSchema,
  links: z
    .array(
      z.object({ masterId: catalogIdSchema, contributorId: catalogIdSchema }),
    )
    .min(1)
    .max(MAX_LINKS),
});

export type LinkResult = { ok: true } | { ok: false; error: string };

/**
 * Points credits to their contact of the Réseau ("Relier", or right after
 * "Ajouter au Réseau", from the Juridique or the Master): every credit of
 * the same person in the project at once. Only credits not linked yet: one
 * already pointing to a contact is never moved. Written with the user's
 * session: RLS requires manage_catalog on a live master, the composite key
 * the same organization; the check here only gives a clean message.
 */
export async function linkContributorContact(input: {
  contactId: string;
  links: Array<{ masterId: string; contributorId: string }>;
}): Promise<LinkResult> {
  const parsed = linkSchema.safeParse(input);
  const access = await requireApproved();
  if (!parsed.success || !can(access, "manage_catalog"))
    return { ok: false, error: fr.auth.errors.forbidden };
  const { contactId, links } = parsed.data;
  const masterIds = [...new Set(links.map((link) => link.masterId))];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("master_contributors")
    .update({ contact_id: contactId })
    .in(
      "id",
      links.map((link) => link.contributorId),
    )
    .in("master_id", masterIds)
    .is("contact_id", null)
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("linkContributorContact:", error.message);
    return { ok: false, error: fr.facts.linkFailed };
  }
  for (const masterId of masterIds)
    revalidatePath(routes.master(masterId), "layout");
  return { ok: true };
}
