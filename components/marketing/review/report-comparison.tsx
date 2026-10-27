import Link from "next/link";

import { PageSection } from "@/components/shell/page-section";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import { formatEuros } from "@/lib/budget/types";
import { marketingReview } from "@/lib/i18n/fr/marketing-review";
import type { ReportComparison } from "@/lib/marketing/reports/compare";

const fr = { marketingReview };

const t = fr.marketingReview.reports.compare;
const figures = fr.marketingReview.dashboard.figures;
const groups = fr.marketingReview.dashboard.groups;
const number = new Intl.NumberFormat("fr-FR");

const groupOf = (key: string): keyof typeof groups =>
  key.startsWith("publications_")
    ? "publications"
    : key.startsWith("coverage_")
      ? "coverage"
      : key.startsWith("statistics_")
        ? "statistics"
        : key.startsWith("budget_")
          ? "budget"
          : key.startsWith("reserves_")
            ? "reserves"
            : "activations";

/** Two versions side by side: each figure that moved, what came in or out.
 * Both read from their own snapshot, with their own rules. */
export function ReportComparisonView({
  from,
  to,
  comparison: c,
  hideHref,
}: {
  from: number;
  to: number;
  comparison: ReportComparison;
  hideHref: string;
}) {
  const show = (key: string, value: number | null) =>
    value === null
      ? fr.marketingReview.dashboard.unavailable
      : key.startsWith("budget_")
        ? formatEuros(value)
        : number.format(value);
  const list = (title: string, items: string[]) =>
    items.length > 0 && (
      <div className="grid gap-1">
        <h3 className="text-sm font-medium">{title}</h3>
        <ul className="grid gap-0.5 text-sm text-muted-foreground">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    );
  return (
    <PageSection
      id="comparison"
      title={t.title(from, to)}
      card
      action={
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={hideHref} scroll={false} />}
          nativeButton={false}
        >
          {t.hide}
        </Button>
      }
    >
      {c.figures.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.identical}</p>
      ) : (
        <DataTable>
          <DataTableHeader>
            <DataTableHead fill>{t.figures}</DataTableHead>
            <DataTableHead>{t.before}</DataTableHead>
            <DataTableHead>{t.after}</DataTableHead>
          </DataTableHeader>
          <DataTableBody>
            {c.figures.map((f) => (
              <DataTableRow key={f.key}>
                <DataTableCell fill>
                  {groups[groupOf(f.key)]} · {figures[f.key]}
                </DataTableCell>
                <DataTableCell className="tabular-nums">
                  {show(f.key, f.before)}
                </DataTableCell>
                <DataTableCell className="font-semibold tabular-nums">
                  {show(f.key, f.after)}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
      <p className="text-sm text-muted-foreground">
        {t.evidence(c.evidenceAdded, c.evidenceRemoved, c.evidenceChanged)}
      </p>
      {list(t.activationsAdded, c.activationsAdded)}
      {list(t.activationsRemoved, c.activationsRemoved)}
      {list(t.reservesAdded, c.reservesAdded)}
      {list(t.reservesRemoved, c.reservesRemoved)}
    </PageSection>
  );
}
