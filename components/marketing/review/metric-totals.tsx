import { PageSection } from "@/components/shell/page-section";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import { fr } from "@/lib/i18n/fr";
import type { MetricTotal } from "@/lib/marketing/dashboard";

const t = fr.marketingReview.dashboard;
const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

/** Totals by metric: declared and verified apart, « Indisponible » when no
 * figure exists, the partial and unavailable readings counted beside. */
export function MetricTotals({ metrics }: { metrics: MetricTotal[] }) {
  if (metrics.length === 0) return null;
  const show = (v: number | null, notAddable: boolean) =>
    v === null ? (
      <span className="text-muted-foreground">
        {notAddable ? t.metrics.notAddable : t.unavailable}
      </span>
    ) : (
      number.format(v)
    );
  return (
    <PageSection
      id="metrics"
      title={t.metrics.title}
      description={t.metrics.description}
    >
      <DataTable>
        <DataTableHeader>
          <DataTableHead fill>{t.metrics.metric}</DataTableHead>
          <DataTableHead>{t.metrics.declared}</DataTableHead>
          <DataTableHead>{t.metrics.verified}</DataTableHead>
          <DataTableHead hideBelow="sm">{t.metrics.gaps}</DataTableHead>
        </DataTableHeader>
        <DataTableBody>
          {metrics.map((m) => (
            <DataTableRow key={m.metric}>
              <DataTableCell fill>{m.metric}</DataTableCell>
              <DataTableCell className="tabular-nums">
                {show(m.declared, m.notAddable)}
              </DataTableCell>
              <DataTableCell className="tabular-nums">
                {show(m.verified, m.notAddable)}
              </DataTableCell>
              <DataTableCell hideBelow="sm" className="text-muted-foreground">
                {t.metrics.gapsText(m.partial, m.unavailable)}
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </PageSection>
  );
}
