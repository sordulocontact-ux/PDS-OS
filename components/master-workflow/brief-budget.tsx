"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import { formatEuros } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import {
  addBriefRateToBudget,
  setBriefBudgetStatus,
  type BudgetResult,
} from "@/lib/master-workflow/budget-actions";
import { BRIEF_ROLES } from "@/lib/master-workflow/brief-proposals";
import type { BriefView } from "@/lib/master-workflow/brief-types";
import { budgetStatusTone } from "@/lib/ui/state-tones";

/**
 * The brief's rates in the project's Budget (ticket § 9): each role, its
 * estimated rate, its line once registered and where it stands (Estimé,
 * Proposé, Engagé, Payé). The owner registers a rate and moves its state
 * here; everyone else reads it.
 */
export function BriefBudget({ view }: { view: BriefView }) {
  const t = fr.masterWorkflow.brief.budget;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<BudgetResult>) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) router.refresh();
      else toast.error(result.error);
    });
  const { brief } = view;
  // The brief's estimate: the sum of its saved rates (code, never typed).
  const rates = [brief.mixRateCents, brief.masteringRateCents].filter(
    (cents): cents is number => cents !== null,
  );
  const total = rates.length ? rates.reduce((sum, c) => sum + c, 0) : null;

  return (
    <div className="grid gap-3">
      <DataTable>
        <DataTableHeader>
          <DataTableHead fill>{t.item}</DataTableHead>
          <DataTableHead align="end">{fr.budget.table.amount}</DataTableHead>
          <DataTableHead align="end" className="w-48">
            {t.status}
          </DataTableHead>
        </DataTableHeader>
        <DataTableBody>
          {BRIEF_ROLES.map((role) => {
            const rate =
              role === "mix" ? brief.mixRateCents : brief.masteringRateCents;
            const line = view.budget.find((row) => row.role === role);
            // The same engineer without a mastering rate: one line, the mix.
            const included =
              role === "mastering" &&
              brief.masteringSameEngineer &&
              rate === null &&
              !line;
            return (
              <DataTableRow key={role}>
                <DataTableCell fill className="max-w-0">
                  <span className="font-medium">{t.roles[role]}</span>
                  {line && rate !== null && rate !== line.amountCents && (
                    <span className="block text-caption text-[color:var(--text-secondary)]">
                      {t.differs(formatEuros(rate))}
                    </span>
                  )}
                </DataTableCell>
                <DataTableCell align="end" className="tabular-nums">
                  {line
                    ? formatEuros(line.amountCents)
                    : rate !== null
                      ? formatEuros(rate)
                      : EMPTY_CELL}
                </DataTableCell>
                <DataTableCell align="end" className="w-48 pl-4">
                  {included ? (
                    <span className="text-[color:var(--text-secondary)]">
                      {t.sameLine}
                    </span>
                  ) : line && view.canEdit ? (
                    <OptionSelect
                      name={`budget-${role}`}
                      label={t.status}
                      hideLabel
                      items={fr.budget.statuses}
                      defaultValue={line.status}
                      onValueChange={(status) =>
                        run(() =>
                          setBriefBudgetStatus(view.projectId, role, status),
                        )
                      }
                    />
                  ) : line ? (
                    <StatusBadge tone={budgetStatusTone[line.status]}>
                      {fr.budget.statuses[line.status]}
                    </StatusBadge>
                  ) : view.canEdit && rate !== null ? (
                    <Button
                      variant="outline"
                      size="xs"
                      disabled={pending}
                      onClick={() =>
                        run(() => addBriefRateToBudget(view.projectId, role))
                      }
                    >
                      {t.add}
                    </Button>
                  ) : (
                    <span className="text-[color:var(--text-secondary)]">
                      {rate === null ? t.noRateShort : t.notInBudget}
                    </span>
                  )}
                </DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
      <p className="text-sm font-medium tabular-nums">
        {total === null ? t.noTotal : t.total(formatEuros(total))}
      </p>
      <Link
        href={routes.projectBudget(view.projectId)}
        className="text-sm underline-offset-4 hover:underline"
      >
        {t.open}
      </Link>
    </div>
  );
}
