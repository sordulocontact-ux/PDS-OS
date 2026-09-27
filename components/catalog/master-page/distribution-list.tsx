import Link from "next/link";

import { ExternalLink } from "@/components/catalog/artist-profile/external-link";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import type { MasterDistributionRelease } from "@/lib/catalog/master/related";
import { fr } from "@/lib/i18n/fr";
import { formatShortDate } from "@/lib/release/format";
import { masterReleaseTone } from "@/lib/ui/state-tones";

// One card per release carrying the master: title and status, the project
// (its Sortie is where it is edited), UPC, date, and the platform links the
// daily detection found.
export function DistributionList({
  releases,
}: {
  releases: MasterDistributionRelease[];
}) {
  const t = fr.masterPage.distribution;
  const platforms: Record<string, string> = fr.release.platforms;
  return (
    <ul className="flex flex-col gap-3">
      {releases.map((release) => (
        <li
          key={release.id}
          className="flex flex-col gap-4 rounded-xl border border-border p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <Link
                href={routes.projectRelease(release.project.id)}
                className="font-medium underline-offset-4 hover:underline"
              >
                {release.title}
              </Link>
              <span className="text-sm text-muted-foreground">
                {release.project.title}
              </span>
            </div>
            <StatusBadge tone={masterReleaseTone[release.status]}>
              {fr.catalog.masters.releaseStatus[release.status]}
            </StatusBadge>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">
                {t.columns.date}
              </dt>
              <dd className="font-medium">
                {release.plannedReleaseDate
                  ? formatShortDate(release.plannedReleaseDate)
                  : fr.catalog.notProvided}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{t.columns.upc}</dt>
              <dd className="font-mono font-medium">
                {release.upc ?? fr.catalog.notProvided}
              </dd>
            </div>
          </dl>
          <div className="flex flex-col gap-2">
            <h3 className="text-xs text-muted-foreground">{t.links}</h3>
            {release.links.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noLinks}</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {release.links.map((link) => (
                  <li key={link.platform}>
                    <ExternalLink
                      href={link.url}
                      icon
                      className="min-h-9 rounded-full border border-border px-3 text-sm font-medium hover:bg-muted"
                    >
                      {platforms[link.platform] ?? link.platform}
                    </ExternalLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
