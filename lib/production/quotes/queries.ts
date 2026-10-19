import "server-only";

import type { Member } from "@/lib/framing/related";
import { createClient } from "@/lib/supabase/server";

export const QUOTE_STATUSES = [
  "deposited",
  "submitted",
  "approved",
  "changes",
  "rejected",
  "replaced",
] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

/** One version of a sheet's quote (V1, V2…). */
export type ProductionQuote = {
  id: string;
  number: number;
  label: string;
  amountCents: number;
  locBudgetCents: number | null;
  deliveryOn: string | null;
  url: string | null;
  note: string | null;
  // Null: the company, through its link.
  depositedBy: string | null;
  depositedAt: string;
  status: QuoteStatus;
  checkNote: string | null;
  submittedBy: string | null;
  submittedAt: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  reason: string | null;
};

/** A sheet's quote versions, newest first, read with the user's session. */
export async function loadQuotes(
  sheetId: string,
  members: Member[],
): Promise<ProductionQuote[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_quotes")
    .select(
      "id, number, label, amount_cents, loc_budget_cents, delivery_on, url, note, deposited_by, deposited_at, status, check_note, submitted_by, submitted_at, decided_by, decided_at, reason",
    )
    .eq("sheet_id", sheetId)
    .order("number", { ascending: false });
  if (error) console.error("loadQuotes:", error.message);
  const name = (id: string | null) =>
    id ? (members.find((m) => m.personId === id)?.name ?? "—") : null;
  return (data ?? []).map((q) => ({
    id: q.id,
    number: q.number,
    label: q.label,
    amountCents: q.amount_cents,
    locBudgetCents: q.loc_budget_cents,
    deliveryOn: q.delivery_on,
    url: q.url,
    note: q.note,
    depositedBy: name(q.deposited_by),
    depositedAt: q.deposited_at,
    status: QUOTE_STATUSES.find((s) => s === q.status) ?? "deposited",
    checkNote: q.check_note,
    submittedBy: name(q.submitted_by),
    submittedAt: q.submitted_at,
    decidedBy: name(q.decided_by),
    decidedAt: q.decided_at,
    reason: q.reason,
  }));
}

/** The active reference: the latest version validated. Null before any. */
export async function activeQuote(sheetId: string): Promise<{
  number: number;
  amountCents: number;
  locBudgetCents: number | null;
} | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("production_quotes")
    .select("number, amount_cents, loc_budget_cents")
    .eq("sheet_id", sheetId)
    .eq("status", "approved")
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data
    ? {
        number: data.number,
        amountCents: data.amount_cents,
        locBudgetCents: data.loc_budget_cents,
      }
    : null;
}
