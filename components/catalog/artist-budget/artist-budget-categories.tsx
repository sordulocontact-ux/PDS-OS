import { PageSection } from "@/components/shell/page-section";
import { Rows } from "@/components/ui/rows";
import {
  type ArtistExpense,
  artistCategoryTotals,
} from "@/lib/catalog/artist-expenses";
import { artistBudget } from "@/lib/i18n/fr/artist-budget";
import { formatAmount } from "@/lib/utils/money";

const fr = { artistBudget };

/**
 * « Par poste »: what each kind of spend adds up to (transport, Uber Eats,
 * studio…), the costliest first, computed by code. Shown from two kinds on:
 * with one, the totals above already say it.
 */
export function ArtistBudgetCategories({
  expenses,
}: {
  expenses: ArtistExpense[];
}) {
  const t = fr.artistBudget;
  const totals = artistCategoryTotals(expenses);
  if (totals.length < 2) return null;
  return (
    <PageSection
      id="artist-budget-categories"
      title={t.byCategory.title}
      description={t.byCategory.hint}
    >
      <Rows label={t.byCategory.title}>
        {totals.map((row) => (
          <li key={row.category} className="flex items-center gap-3 px-4 py-3">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">
                {t.categories[row.category]}
              </span>
              <span className="text-caption text-muted-foreground tabular-nums">
                {[
                  t.byCategory.count(row.count),
                  row.plannedCents > 0 &&
                    t.byCategory.planned(formatAmount(row.plannedCents)),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            <span className="text-sm tabular-nums">
              {formatAmount(row.totalCents)}
            </span>
          </li>
        ))}
      </Rows>
    </PageSection>
  );
}
