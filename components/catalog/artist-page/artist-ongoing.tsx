import { FormMessage } from "@/components/auth/form-message";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import type {
  ProjectProgress,
  ProjectWait,
} from "@/lib/catalog/artist-progress";
import { catalog } from "@/lib/i18n/fr/catalog";
import { journey } from "@/lib/i18n/fr/journey";
import { lowerFirst } from "@/lib/ui/journey";
import { formatShortDay } from "@/lib/utils/day";

import { SectionRow, SectionRows } from "@/components/ui/section-rows";

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
 * each launched project, its format, where it stands and who it waits for
 * (the project's journeys, as Travail and the home), its date on the right;
 * the project's name opens it.
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
        <SectionRows label={t.title}>
          {projects.map((p) => (
            <SectionRow
              key={p.projectId}
              title={
                <>
                  <ViewLink
                    href={routes.project(p.projectId)}
                    className="font-semibold no-underline hover:underline"
                  >
                    {p.title}
                  </ViewLink>
                  {p.format && ` · ${p.format}`}
                </>
              }
              detail={[p.place, waitText(p.wait)].filter(Boolean).join(" · ")}
              badge={
                p.dueDate && (
                  <StatusBadge tone="neutral" size="sm">
                    {(p.music ? t.release : t.due)(
                      formatShortDay(p.dueDate, { bare: true }),
                    )}
                  </StatusBadge>
                )
              }
            />
          ))}
        </SectionRows>
      )}
    </PageSection>
  );
}
