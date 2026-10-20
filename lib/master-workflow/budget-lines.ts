import "server-only";

import { createClient } from "@/lib/supabase/server";

// The Master's budget lines (the engineer's rates, proto `budgetRows`),
// read with the session: the owner and the direction (RLS, like the budget).

export type MasterBudgetLine = {
  stage: "mix" | "mastering";
  label: string;
  amountCents: number;
  status: string;
  note: string | null;
};

export async function loadMasterBudgetLines(
  projectId: string,
): Promise<MasterBudgetLine[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("budget_lines")
    .select("master_role, label, amount_cents, status, note")
    .eq("project_id", projectId)
    .not("master_role", "is", null)
    .order("master_role", { ascending: false });
  if (error) console.error("loadMasterBudgetLines:", error.message);
  return (data ?? []).flatMap((l) =>
    l.master_role === "mix" || l.master_role === "mastering"
      ? [
          {
            stage: l.master_role,
            label: l.label,
            amountCents: l.amount_cents,
            status: l.status,
            note: l.note,
          },
        ]
      : [],
  );
}
