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
import { reviewJourney } from "@/lib/i18n/fr/review-journey";
import type { BudgetBreakdown } from "@/lib/marketing/review/budget-breakdown";
import type { ObjectiveRow } from "@/lib/marketing/review/objectives";
import { money } from "@/lib/marketing/review/standing";
import { formatDay } from "@/lib/utils/day";

const fr = { reviewJourney };

const t = fr.reviewJourney.goals;
const numbers = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const tone = {
  reached: "success",
  below: "warning",
  not_measurable: "neutral",
} as const;

const Title = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold">
    {children}
  </h3>
);
const Rule = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]">
    {children}
  </p>
);
const figure = (n: number | null, unit: string | null) =>
  n === null ? EMPTY_CELL : [numbers.format(n), unit].filter(Boolean).join(" ");

/**
 * Under « Voir le détail » of « Où on en est » (recette of 23/10,
 * MKT-BIL-002): each objective of the Stratégie against the activations'
 * figures, its gap and state (« Non mesurable » with why), then the budget
 * by activation — estimated, committed, invoiced, paid — and the gap to the
 * envelope. Computed by code at each opening; the budget only for its readers.
 */
export function StandingGoals({
  goals,
  budget,
}: {
  goals: ObjectiveRow[];
  budget: BudgetBreakdown | null;
}) {
  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <Title>{t.objectives}</Title>
        {goals.length === 0 ? (
          <Rule>{t.objectivesNone}</Rule>
        ) : (
          <DataTable>
            <DataTableHeader>
              <DataTableHead fill>{t.objective}</DataTableHead>
              <DataTableHead align="end">{t.target}</DataTableHead>
              <DataTableHead align="end" hideBelow="md">
                {t.declared}
              </DataTableHead>
              <DataTableHead align="end" hideBelow="lg">
                {t.verified}
              </DataTableHead>
              <DataTableHead align="end">{t.gap}</DataTableHead>
            </DataTableHeader>
            <DataTableBody>
              {goals.map((g) => (
                <DataTableRow key={g.id}>
                  <DataTableCell fill>
                    <span className="flex flex-col gap-1">
                      <span className="break-words">{g.label}</span>
                      <span className="flex flex-wrap items-center gap-1.5 text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]">
                        <StatusBadge tone={tone[g.state]} size="sm">
                          {t.states[g.state]}
                        </StatusBadge>
                        {[
                          g.reason ? t.reasons[g.reason] : null,
                          g.early && g.dueOn
                            ? t.early(formatDay(g.dueOn))
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                  </DataTableCell>
                  <DataTableCell align="end">
                    {figure(g.target, g.unit)}
                  </DataTableCell>
                  <DataTableCell align="end" hideBelow="md">
                    {figure(g.declared, null)}
                  </DataTableCell>
                  <DataTableCell align="end" hideBelow="lg">
                    {figure(g.verified, null)}
                  </DataTableCell>
                  <DataTableCell align="end">
                    {g.gap === null
                      ? EMPTY_CELL
                      : `${g.gap > 0 ? "+" : ""}${numbers.format(g.gap)}${g.ratio === null ? "" : ` (${numbers.format(g.ratio * 100)} %)`}`}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
        <Rule>{t.rule}</Rule>
      </section>
      {budget && (
        <section className="flex flex-col gap-2">
          <Title>{t.budget}</Title>
          {budget.rows.length === 0 ? (
            <Rule>{t.budgetNone}</Rule>
          ) : (
            <DataTable>
              <DataTableHeader>
                <DataTableHead fill>{t.activation}</DataTableHead>
                <DataTableHead align="end" hideBelow="md">
                  {t.estimated}
                </DataTableHead>
                <DataTableHead align="end">{t.committed}</DataTableHead>
                <DataTableHead align="end" hideBelow="lg">
                  {t.invoiced}
                </DataTableHead>
                <DataTableHead align="end" hideBelow="lg">
                  {t.paid}
                </DataTableHead>
              </DataTableHeader>
              <DataTableBody>
                {[...budget.rows, budget.total].map((r, i) => (
                  <DataTableRow
                    key={r.activationId ?? `${r.title}-${i}`}
                    className={
                      i === budget.rows.length ? "font-semibold" : undefined
                    }
                  >
                    <DataTableCell fill>
                      <span className="break-words">{r.title}</span>
                    </DataTableCell>
                    <DataTableCell align="end" hideBelow="md">
                      {money(r.estimatedCents)}
                    </DataTableCell>
                    <DataTableCell align="end">
                      {money(r.committedCents)}
                    </DataTableCell>
                    <DataTableCell align="end" hideBelow="lg">
                      {money(r.invoicedCents)}
                    </DataTableCell>
                    <DataTableCell align="end" hideBelow="lg">
                      {money(r.paidCents)}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
          <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)]">
            {budget.envelopeCents === null || budget.gapCents === null
              ? t.noEnvelope
              : t.envelope(
                  money(budget.envelopeCents),
                  money(Math.abs(budget.gapCents)),
                  budget.gapCents < 0,
                )}
          </p>
          <Rule>{t.budgetRule}</Rule>
        </section>
      )}
    </div>
  );
}
