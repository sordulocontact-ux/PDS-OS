import { SectionTabs } from "@/components/shell/section-tabs";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

// Sections of an artist. The discography only exists for an artist
// imported from Deezer. « Identité »: its permanent identity (MKT-C2-04).
export function ArtistTabs({
  artistId,
  hasDeezer,
}: {
  artistId: string;
  hasDeezer: boolean;
}) {
  const t = fr.catalog.artistPage;
  return (
    <SectionTabs
      label={t.tabsLabel}
      tabs={[
        { href: routes.artist(artistId), label: t.tabs.overview, exact: true },
        { href: routes.artistMasters(artistId), label: t.tabs.masters },
        { href: routes.artistProjects(artistId), label: t.tabs.projects },
        { href: routes.artistIdentity(artistId), label: fr.artistIdentity.tab },
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
