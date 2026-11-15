import "server-only";

import { budget } from "@/lib/i18n/fr/budget";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * « Une dépense refacturable doit créer une recette attendue distincte »
 * (Ibé's ticket): the expected income of a rebillable spend, once (none
 * when a live one already rebills it). Written with the session: only the
 * Finance (manage_finance) creates it; anyone else's rebillable spend is
 * signalled to the Finance on the overview instead.
 */
export async function planRebilling(
  supabase: Supabase,
  organizationId: string,
  lineId: string,
  spend: {
    label: string;
    cents: number;
    projectId: string | null;
    artistId: string | null;
    expectedOn: string;
  },
) {
  const { data: existing } = await supabase
    .from("finance_incomes")
    .select("id")
    .eq("source_line_id", lineId)
    .is("cancelled_at", null)
    .limit(1);
  if (existing?.length) return;
  const { error } = await supabase.from("finance_incomes").insert({
    organization_id: organizationId,
    label: budget.rebilling.label(spend.label).slice(0, 200),
    kind: "rebilling",
    amount_cents: spend.cents,
    project_id: spend.projectId,
    artist_id: spend.artistId,
    expected_on: spend.expectedOn,
    source_line_id: lineId,
  });
  if (error) console.error("planRebilling:", error.message);
}
