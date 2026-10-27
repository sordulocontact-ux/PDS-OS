import { FormMessage } from "@/components/auth/form-message";
import { PageSection } from "@/components/shell/page-section";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { Timestamp } from "@/components/ui/timestamp";
import { routes } from "@/lib/auth/redirects";
import type { MasterReleaseDates } from "@/lib/catalog/master/related";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { formatShortDate } from "@/lib/release/format";

const fr = { masterPage };

/**
 * The three release dates of each project of the title, side by side and
 * never merged (retours Catalogue 55 et 66): visée, confirmée, effective.
 */
export function ReleaseDatesSection({
  dates,
  error,
}: {
  dates: MasterReleaseDates[];
  error: boolean;
}) {
  const t = fr.masterPage.projects.dates;
  if (!error && dates.length === 0) return null;
  return (
    <PageSection card id="dates" title={t.title} description={t.description}>
      {error ? (
        <FormMessage kind="error">{fr.masterPage.loadError}</FormMessage>
      ) : (
        <DataTable>
          <DataTableHeader>
            <DataTableHead>{t.project}</DataTableHead>
            <DataTableHead>{t.target}</DataTableHead>
            <DataTableHead hideBelow="sm">{t.confirmed}</DataTableHead>
            <DataTableHead hideBelow="sm" fill>
              {t.effective}
            </DataTableHead>
          </DataTableHeader>
          <DataTableBody>
            {dates.map((d) => (
              <DataTableRow key={d.project.id}>
                <DataTableCell>
                  <DataTableLink href={routes.project(d.project.id)}>
                    {d.project.title}
                  </DataTableLink>
                </DataTableCell>
                <DataTableCell>
                  {d.target ? formatShortDate(d.target) : EMPTY_CELL}
                </DataTableCell>
                <DataTableCell hideBelow="sm">
                  {d.confirmed ? formatShortDate(d.confirmed) : EMPTY_CELL}
                </DataTableCell>
                <DataTableCell hideBelow="sm" fill>
                  {d.effective ? (
                    <Timestamp iso={d.effective} show="day" />
                  ) : (
                    EMPTY_CELL
                  )}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </PageSection>
  );
}
