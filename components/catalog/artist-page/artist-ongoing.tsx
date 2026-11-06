import { FormMessage } from "@/components/auth/form-message";
import { EmptyNote } from "@/components/shell/empty-state";
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
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import type { ProjectProgress } from "@/lib/catalog/artist-progress";
import { catalog } from "@/lib/i18n/fr/catalog";
import { formatShortDay } from "@/lib/utils/day";

const fr = { catalog };

/**
 * « En cours » of the artist's overview (proto `docs/protos/pages.html`):
 * each launched project, its type (Single, Album…) and its date; neither its
 * current step nor who it waits for (Sacha, 06/11/2026). The project's name
 * opens it.
 */
export function ArtistOngoing({
  projects,
  error,
}: {
  projects: ProjectProgress[];
  error: boolean;
}) {
  const t = fr.catalog.artistPage.ongoing;
  return (
    <PageSection card id="ongoing" title={t.title} description={t.description}>
      {error && <FormMessage kind="error">{t.error}</FormMessage>}
      {projects.length === 0 ? (
        !error && <EmptyNote>{t.none}</EmptyNote>
      ) : (
        <DataTable framed>
          <DataTableHeader>
            <DataTableHead>{t.columns.project}</DataTableHead>
            <DataTableHead hideBelow="sm">{t.columns.type}</DataTableHead>
            <DataTableHead fill>{t.columns.date}</DataTableHead>
          </DataTableHeader>
          <DataTableBody>
            {projects.map((p) => (
              <DataTableRow key={p.projectId}>
                <DataTableCell>
                  <DataTableLink href={routes.project(p.projectId)}>
                    {p.title}
                  </DataTableLink>
                </DataTableCell>
                <DataTableCell hideBelow="sm">
                  {p.format ?? EMPTY_CELL}
                </DataTableCell>
                <DataTableCell fill>
                  {p.dueDate ? (
                    <StatusBadge tone="neutral" size="sm">
                      {(p.music ? t.release : t.due)(
                        formatShortDay(p.dueDate, { bare: true }),
                      )}
                    </StatusBadge>
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
