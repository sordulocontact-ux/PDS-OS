import { SectionTabs } from "@/components/shell/section-tabs";
import { routes } from "@/lib/auth/redirects";
import { artistBudget } from "@/lib/i18n/fr/artist-budget";
import { artistIdentity } from "@/lib/i18n/fr/artist-identity";
import { catalog } from "@/lib/i18n/fr/catalog";

const fr = { catalog, artistIdentity, artistBudget };

// Sections of an artist. The discography only exists for an artist
// imported from Deezer. « Identité »: its permanent identity (MKT-C2-04).
// « Budget »: its envelope and spends, for the budget's readers (BUD 2).
export function ArtistTabs({
  artistId,
  hasDeezer,
  showBudget,
}: {
  artistId: string;
  hasDeezer: boolean;
  showBudget: boolean;
}) {
  const t = fr.catalog.artistPage;
  return (
    <SectionTabs
      label={t.tabsLabel}
      tabs={[
        { href: routes.artist(artistId), label: t.tabs.overview, exact: true },
        { href: routes.artistMasters(artistId), label: t.tabs.masters },
        { href: routes.artistProjects(artistId), label: t.tabs.projects },
        // Its studio sessions (retour d'Ibé du 01/11/2026).
        { href: routes.artistSessions(artistId), label: t.tabs.sessions },
        { href: routes.artistIdentity(artistId), label: fr.artistIdentity.tab },
        ...(showBudget
          ? [
              {
                href: routes.artistBudget(artistId),
                label: fr.artistBudget.tab,
              },
            ]
          : []),
        { href: routes.artistFiles(artistId), label: t.tabs.files },
        { href: routes.artistActivity(artistId), label: t.tabs.activity },
        ...(hasDeezer
          ? [
              {
                href: routes.artistDiscography(artistId),
                label: t.tabs.discography,
              },
            ]
          : []),
      ]}
    />
  );
}
