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
  DataTableMedia,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import type {
  ProjectProgress,
  ProjectWait,
} from "@/lib/catalog/artist-progress";
import { catalog } from "@/lib/i18n/fr/catalog";
import { journey } from "@/lib/i18n/fr/journey";
import { lowerFirst } from "@/lib/ui/journey";
import { formatShortDay } from "@/lib/utils/day";

const fr = { catalog, journey };

/** « À vous : … », « En attente de Karim Haddou (lien privé) : … ». */
function waitText(wait: ProjectWait | null): string {
  const t = fr.catalog.artistPage.ongoing;
  if (!wait) return t.nothing;
  const todo = lowerFirst(wait.todo);
  if (wait.mine) return t.mine(todo);
  if (!wait.who) return t.nobody(todo);
  const via = wait.viaLink ? ` (${fr.journey.privateLink})` : "";
  return `${fr.journey.now.waitFor(wait.who)}${via} : ${todo}`;
}

/**
 * « En cours » of the artist's overview (proto `docs/protos/pages.html`):
 * each launched project, its format, its date and who it waits for (the
 * project's journeys, as Travail and the home); not its current step (Sacha,
 * 06/11/2026). The project's name opens it.
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
            <DataTableHead hideBelow="sm">{t.columns.date}</DataTableHead>
            <DataTableHead fill>{t.columns.awaited}</DataTableHead>
          </DataTableHeader>
          <DataTableBody>
            {projects.map((p) => (
              <DataTableRow key={p.projectId}>
                <DataTableCell>
                  <DataTableMedia
                    title={
                      <DataTableLink href={routes.project(p.projectId)}>
                        {p.title}
                      </DataTableLink>
                    }
                    subtitle={p.format}
                  />
                </DataTableCell>
                <DataTableCell hideBelow="sm">
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
                <DataTableCell fill className="break-words">
                  {waitText(p.wait)}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </PageSection>
  );
}
