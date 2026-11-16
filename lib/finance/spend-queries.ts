import "server-only";

import {
  budgetLineTtcCents,
  isBudgetFamily,
  isBudgetStatus,
} from "@/lib/budget/types";
import type { FinanceSpend } from "@/lib/finance/spends";
import { createClient } from "@/lib/supabase/server";

/** Matched in full with the bank: its TTC settled by transactions. */
const paidByBank = (r: {
  matched_cents: number;
  amount_cents: number;
  vat_bp: number | null;
}) =>
  Number(r.matched_cents) > 0 &&
  Number(r.matched_cents) >=
    budgetLineTtcCents(Number(r.amount_cents), r.vat_bp);

/**
 * Every spend of the label for whoever reads Finance, through
 * finance_spends() (20261113300101_finance_spends.sql): the lines keep
 * their own rules, the Finance reads them all. Read with the session.
 */
export async function loadSpends(): Promise<{
  spends: FinanceSpend[];
  error: boolean;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("finance_spends");
  if (error) console.error("loadSpends:", error.message);
  return {
    spends: (data ?? []).map((r): FinanceSpend => ({
      id: r.line_id,
      label: r.label,
      cents: Number(r.amount_cents),
      forecastCents: Number(r.forecast_cents),
      vatBp: r.vat_bp,
      family: isBudgetFamily(r.family) ? r.family : null,
      familyDetail: r.family_detail,
      subpost: r.subpost,
      status: paidByBank(r)
        ? "paid"
        : isBudgetStatus(r.status)
          ? r.status
          : "planned",
      paidByBank: paidByBank(r),
      spentOn: r.spent_on,
      dueOn: r.due_on,
      target: r.project_id
        ? { kind: "project", id: r.project_id }
        : r.artist_id
          ? { kind: "artist", id: r.artist_id }
          : r.cost_center_id
            ? { kind: "cost_center", id: r.cost_center_id }
            : { kind: "off_budget", id: "" },
      supplierContactId: r.supplier_contact_id,
      supplier: r.supplier_name,
      rebillable: r.rebillable,
      rebillIncomeId: r.rebill_income_id,
      validatorId: r.validator_person_id,
      note: r.note,
      hasProof: r.has_proof,
      proof:
        r.proof_path && r.proof_name
          ? { path: r.proof_path, name: r.proof_name }
          : null,
      refused: r.refused,
    })),
    error: Boolean(error),
  };
}
