import { PageSection } from "@/components/shell/page-section";
import { Rows } from "@/components/ui/rows";
import {
  budgetFamilyTotals,
  formatEuros,
  type BudgetLine,
} from "@/lib/budget/types";
import { budget } from "@/lib/i18n/fr/budget";

const fr = { budget };

/**
 * « Par poste » of a project's Budget (retour du 09/11/2026, taken from the
 * artist's Budget, removed): what each poste adds up to (transport, livraison
 * de repas, studio…), the costliest first, what is not engaged yet said
 * below; computed by code. Shown from two postes on: with one, the totals
 * above already say it.
 */
export function BudgetByFamily({ lines }: { lines: BudgetLine[] }) {
  const t = fr.budget;
  const totals = budgetFamilyTotals(lines);
  if (totals.length < 2) return null;
  return (
    <PageSection
      id="budget-by-family"
      title={t.byFamily.title}
      description={t.byFamily.hint}
    >
      <Rows label={t.byFamily.title}>
        {totals.map((row) => (
          <li
            key={row.family ?? "none"}
            className="flex items-center gap-3 px-4 py-3"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-medium break-words text-[color:var(--text-primary)]">
                {row.family ? t.families[row.family] : t.byFamily.none}
              </span>
              <span className="text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)] tabular-nums">
                {[
                  t.byFamily.count(row.count),
                  row.pendingCents > 0 &&
                    t.byFamily.pending(formatEuros(row.pendingCents)),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <span className="shrink-0 text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold tabular-nums">
              {formatEuros(row.totalCents)}
            </span>
          </li>
        ))}
      </Rows>
    </PageSection>
  );
}
