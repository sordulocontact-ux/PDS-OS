"use server";

import { revalidatePath } from "next/cache";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import { confirmedSplitOf } from "@/lib/legal/splits/title-split";
import { createClient } from "@/lib/supabase/server";

// The title's split takes the confirmed version of the Juridique, on one
// explicit click (« plutôt que de faire saisir les mêmes parts deux fois »).
// The title's shares keep two decimals: the exact shares are rounded so they
// still total 100 % (largest remainder); the exact version stays in the
// Juridique.

const ROLE = {
  author: "author",
  composer: "composer",
  arranger: "other",
  publisher: "publisher",
  other: "other",
} as const;

/** Units of ten-thousandths → hundredths that still total 100,00. */
function toHundredths(units: number[]): number[] {
  const floors = units.map((u) => Math.floor(u / 100));
  let rest = 10_000 - floors.reduce((a, b) => a + b, 0);
  const order = units
    .map((u, i) => ({ i, r: u % 100 }))
    .sort((a, b) => b.r - a.r);
  for (const { i } of order) {
    if (rest <= 0) break;
    floors[i] += 1;
    rest -= 1;
  }
  return floors;
}

export async function adoptConfirmedSplit(
  masterId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = catalogIdSchema.safeParse(masterId);
  const access = await requireApproved();
  if (!id.success || !can(access, "manage_catalog") || !access.organizationId)
    return { ok: false, error: fr.auth.errors.forbidden };
  const confirmed = await confirmedSplitOf(id.data);
  if (!confirmed)
    return { ok: false, error: fr.masterPage.splits.confirmed.failed };

  const shares = toHundredths(confirmed.lines.map((l) => l.units));
  const supabase = await createClient();
  const removed = await supabase
    .from("master_splits")
    .delete()
    .eq("master_id", id.data)
    .eq("kind", "publishing");
  if (removed.error) {
    console.error("adoptConfirmedSplit:", removed.error.message);
    return { ok: false, error: fr.masterPage.splits.confirmed.failed };
  }
  const { error } = await supabase.from("master_splits").insert(
    confirmed.lines.map((line, i) => ({
      organization_id: access.organizationId!,
      master_id: id.data,
      kind: "publishing",
      party: line.name,
      role: ROLE[line.role],
      share: shares[i] / 100,
      contact_id: line.contactId,
    })),
  );
  if (error) {
    console.error("adoptConfirmedSplit insert:", error.message);
    return { ok: false, error: fr.masterPage.splits.confirmed.failed };
  }
  revalidatePath(routes.master(id.data), "layout");
  return { ok: true };
}
