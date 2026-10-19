import "server-only";

import { formatEuros } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

const t = fr.productionPlace;

/** A place's price for the shoot days against the amount the active quote
 * plans for the places (proto locFit): computed by code. */
export function placeFit(
  priceCents: number | null,
  shootDays: number,
  quote: { number: number; locBudgetCents: number | null } | null,
): { ok: boolean; gapCents: number; text: string } | null {
  if (priceCents === null || !quote || quote.locBudgetCents === null)
    return null;
  const gap = priceCents * shootDays - quote.locBudgetCents;
  const loc = formatEuros(quote.locBudgetCents);
  return gap > 0
    ? {
        ok: false,
        gapCents: gap,
        text: t.over(formatEuros(gap), loc, quote.number),
      }
    : { ok: true, gapCents: 0, text: t.fits(quote.number, loc) };
}

export type PlaceDecision = {
  id: string;
  name: string;
  reason: string | null;
  by: string | null;
  at: string;
  // When a later decision replaced it.
  replacedAt: string | null;
};

/** « Décisions sur le lieu », oldest first. */
export async function loadPlaceDecisions(
  sheetId: string,
  nameOf: (personId: string | null) => string | null,
  placeOf: (optionId: string) => string,
): Promise<PlaceDecision[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_location_decisions")
    .select("id, option_id, replaced_option_id, reason, decided_by, decided_at")
    .eq("sheet_id", sheetId)
    .order("decided_at");
  if (error) console.error("loadPlaceDecisions:", error.message);
  const rows = data ?? [];
  return rows.map((d) => {
    const next = rows.find((x) => x.replaced_option_id === d.option_id);
    return {
      id: d.id,
      name: placeOf(d.option_id),
      reason: d.reason,
      by: nameOf(d.decided_by),
      at: d.decided_at,
      replacedAt: next?.decided_at ?? null,
    };
  });
}
