import { PageSection } from "@/components/shell/page-section";
import { FactList } from "@/components/ui/fact-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { variantText } from "@/lib/catalog/title-rules";
import { formatDuration, type MasterDetail } from "@/lib/catalog/types";
import { catalog } from "@/lib/i18n/fr/catalog";
import { masterPage } from "@/lib/i18n/fr/master-page";

const fr = { catalog, masterPage };

/**
 * « Informations » of a title (proto `docs/protos/titre.html`): what is not
 * a piece of the dossier — its variant, its duration, its artists in a
 * plain list (one or two names do not make a table). The identifiers are
 * in the dossier, never twice. `status`: where the title stands (audio,
 * reference version, projects, distribution), here rather than in a line
 * under the title (Sacha, 29/10/2026).
 */
export function TitleInfo({
  master,
  status,
}: {
  master: MasterDetail;
  status: { label: string; value: string }[];
}) {
  const t = fr.masterPage.overview;
  const m = fr.catalog.master;
  return (
    <PageSection card id="facts" title={t.facts}>
      <div className="flex flex-col gap-4">
        <FactList
          emptyLabel={fr.catalog.notProvided}
          facts={[
            ...status,
            {
              label: m.variant,
              value: variantText(master) ?? fr.catalog.variants.original,
            },
            {
              label: m.duration,
              value: master.durationSeconds
                ? formatDuration(master.durationSeconds)
                : null,
              valueClassName: "tabular-nums",
            },
          ]}
        />
        <div className="flex flex-col gap-1.5">
          <h3 className="text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
            {t.artists}
          </h3>
          <ul className="flex flex-col gap-1.5">
            {master.credits.map((credit) => (
              <li
                key={credit.artistId}
                className="flex items-center justify-between gap-2"
              >
                <ViewLink
                  href={routes.artist(credit.artistId)}
                  className="min-w-0 break-words no-underline hover:underline"
                >
                  {credit.name}
                </ViewLink>
                <StatusBadge tone="neutral" size="sm">
                  {fr.catalog.artistPicker.roles[credit.role]}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageSection>
  );
}
