import { SectionTabs } from "@/components/shell/section-tabs";
import { routes } from "@/lib/auth/redirects";
import { artistBusiness } from "@/lib/i18n/fr/artist-business";
import { artistIdentity } from "@/lib/i18n/fr/artist-identity";
import { catalog } from "@/lib/i18n/fr/catalog";

const fr = { catalog, artistIdentity, artistBusiness };

// Sections of an artist. The discography only exists for an artist
// imported from Deezer. « Identité »: its permanent identity (MKT-C2-04).
// « Business »: its deals then its budget (BIZ 10, Budget and Deals in one
// tab: the page already has more tabs than the rule's six), for whoever
// reads the budget or sees one of its deals.
export function ArtistTabs({
  artistId,
  hasDeezer,
  showBusiness,
}: {
  artistId: string;
  hasDeezer: boolean;
  showBusiness: boolean;
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
        ...(showBusiness
          ? [
              {
                href: routes.artistBusiness(artistId),
                label: fr.artistBusiness.tab,
              },
            ]
          : []),
        { href: routes.artistFiles(artistId), label: t.tabs.files },
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
