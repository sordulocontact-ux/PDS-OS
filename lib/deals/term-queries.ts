import "server-only";

import { parseTermValue } from "@/lib/deals/term-format";
import {
  DEAL_TERMS,
  TERM_STATES,
  type DealTerm,
  type TermState,
} from "@/lib/deals/terms";
import type { DealKind } from "@/lib/deals/types";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

const isState = (value: string): value is TermState =>
  (TERM_STATES as readonly string[]).includes(value);

/**
 * The terms of a deal (BIZ 3), every term of its kind in the configured
 * order, « À définir » when never written; read with the user's session
 * (whoever reads the deal reads its terms). A stored term no longer in the
 * configuration is not shown.
 */
export async function loadDealTerms(
  dealId: string,
  kind: DealKind,
): Promise<DealTerm[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deal_terms")
    .select(
      "term_key, value, state, changed_at, author:people!deal_terms_changed_by_fkey(first_name, last_name)",
    )
    .eq("deal_id", dealId);
  if (error) console.error("loadDealTerms:", error.message);
  const rows = new Map((data ?? []).map((row) => [row.term_key, row]));
  return DEAL_TERMS[kind].map((term): DealTerm => {
    const row = rows.get(term.key);
    const value = row ? parseTermValue(term.format, row.value) : null;
    const state = row && isState(row.state) ? row.state : "to_define";
    return {
      key: term.key,
      format: term.format,
      value,
      state: value === null ? "to_define" : state,
      changedBy: row?.author
        ? personName(row.author.first_name, row.author.last_name)
        : null,
      changedAt: row?.changed_at ?? null,
    };
  });
}
