import { SectionTabs } from "@/components/shell/section-tabs";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

// Sections of an artist. The discography only exists for an artist
// imported from Deezer.
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
