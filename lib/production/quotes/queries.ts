import "server-only";

import type { Member } from "@/lib/framing/related";
import { createClient } from "@/lib/supabase/server";

export type ProductionQuote = {
  id: string;
  label: string;
  amountCents: number;
  deliveryOn: string | null;
  url: string | null;
  note: string | null;
  // Null: the company, through its link.
  depositedBy: string | null;
  depositedAt: string;
  status: "deposited" | "submitted" | "approved" | "rejected";
  checkNote: string | null;
  submittedBy: string | null;
  submittedAt: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  reason: string | null;
};

const STATUSES = ["deposited", "submitted", "approved", "rejected"] as const;

/** A sheet's quotes, newest first, read with the user's session. */
export async function loadQuotes(
  sheetId: string,
  members: Member[],
): Promise<ProductionQuote[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_quotes")
    .select(
      "id, label, amount_cents, delivery_on, url, note, deposited_by, deposited_at, status, check_note, submitted_by, submitted_at, decided_by, decided_at, reason",
    )
    .eq("sheet_id", sheetId)
    .order("deposited_at", { ascending: false });
  if (error) console.error("loadQuotes:", error.message);
  const name = (id: string | null) =>
    id ? (members.find((m) => m.personId === id)?.name ?? "—") : null;
  return (data ?? []).map((q) => ({
    id: q.id,
    label: q.label,
    amountCents: q.amount_cents,
    deliveryOn: q.delivery_on,
    url: q.url,
    note: q.note,
    depositedBy: name(q.deposited_by),
    depositedAt: q.deposited_at,
    status: STATUSES.find((s) => s === q.status) ?? "deposited",
    checkNote: q.check_note,
    submittedBy: name(q.submitted_by),
    submittedAt: q.submitted_at,
    decidedBy: name(q.decided_by),
    decidedAt: q.decided_at,
    reason: q.reason,
  }));
}
