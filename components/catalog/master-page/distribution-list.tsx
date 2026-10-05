import { ExternalLink } from "@/components/catalog/artist-profile/external-link";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import type { MasterDistributionRelease } from "@/lib/catalog/master/related";
import { fr } from "@/lib/i18n/fr";
import { formatShortDate } from "@/lib/release/format";
import { masterReleaseTone } from "@/lib/ui/state-tones";

// Releases carrying the master, listed like every table: the release (opens
// the project's Sortie, where it is edited) and its project, status, date,
// UPC, and the platform links the daily detection found.
export function DistributionList({
  releases,
}: {
  releases: MasterDistributionRelease[];
}) {
  const t = fr.masterPage.distribution;
  const platforms: Record<string, string> = fr.release.platforms;
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead>{t.columns.release}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.columns.status}</DataTableHead>
        <DataTableHead hideBelow="md">{t.columns.date}</DataTableHead>
        <DataTableHead hideBelow="lg">{t.columns.upc}</DataTableHead>
        <DataTableHead hideBelow="lg" fill>
          {t.columns.links}
        </DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {releases.map((release) => (
          <DataTableRow key={release.id}>
            <DataTableCell>
              <DataTableMedia
                title={
                  <DataTableLink
                    href={routes.projectRelease(release.project.id)}
                  >
                    {release.title}
                  </DataTableLink>
                }
                subtitle={release.project.title}
              />
            </DataTableCell>
            <DataTableCell hideBelow="sm">
              <StatusBadge tone={masterReleaseTone[release.status]} size="sm">
                {fr.catalog.masters.releaseStatus[release.status]}
              </StatusBadge>
            </DataTableCell>
            <DataTableCell hideBelow="md">
              {release.plannedReleaseDate
                ? formatShortDate(release.plannedReleaseDate)
                : fr.catalog.notProvided}
            </DataTableCell>
            <DataTableCell hideBelow="lg" className="font-mono">
              {release.upc ?? fr.catalog.notProvided}
            </DataTableCell>
            <DataTableCell hideBelow="lg" fill>
              {release.links.length === 0 ? (
                <span className="text-muted-foreground">{t.noLinks}</span>
              ) : (
                // Above the row's link, so each stays clickable.
                <ul className="relative z-10 flex flex-wrap gap-x-4 gap-y-1">
                  {release.links.map((link) => (
                    <li key={link.platform}>
                      <ExternalLink
                        href={link.url}
                        icon
                        className="underline-offset-4 hover:underline"
                      >
                        {platforms[link.platform] ?? link.platform}
                      </ExternalLink>
                    </li>
                  ))}
                </ul>
              )}
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
