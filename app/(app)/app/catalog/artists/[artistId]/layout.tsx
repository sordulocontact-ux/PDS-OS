import { IconPlus } from "nucleo-sharp-essential";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ArtistActions } from "@/components/catalog/artist-actions";
import { Avatar } from "@/components/ui/avatar";
import { ArtistEditDialog } from "@/components/catalog/artist-page/artist-edit-dialog";
import { ArtistTabs } from "@/components/catalog/artist-page/artist-tabs";
import { ArtistIdentityNow } from "@/components/catalog/artist-page/identity-now";
import { ExternalLink } from "@/components/catalog/artist-profile/external-link";
import { PageHeader } from "@/components/shell/page-header";
import { SectionFrame } from "@/components/shell/section-frame";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { getArtist } from "@/lib/catalog/artist-queries";
import { showsArtistBusiness } from "@/lib/deals/artist-has-deals";
import { countryName } from "@/lib/catalog/countries";
import { fr } from "@/lib/i18n/fr";
import { allInOrder } from "@/lib/utils/parallel";
import { shell as shellText } from "@/lib/i18n/fr/shell";

const shellNav = shellText.nav;

// Artist frame: header (picture, name, actions), « Maintenant » when the
// direction has a proposal of identity to decide (streamed: the header does
// not wait for it), and section tabs. Pages
// below check access themselves (a layout does not re-run on client
// navigation); getArtist is cached per request, so they reuse it.
// The tab names the artist and the section, as a project's pages do.
export async function generateMetadata({
  params,
}: LayoutProps<"/app/catalog/artists/[artistId]">): Promise<Metadata> {
  const { artistId } = await params;
  const artist = await getArtist(artistId).catch(() => null);
  if (!artist) return {};
  return {
    title: {
      template: `${artist.name} · %s · ${fr.app.name}`,
      default: `${artist.name} · ${fr.app.name}`,
    },
  };
}

export default async function ArtistLayout({
  children,
  params,
}: LayoutProps<"/app/catalog/artists/[artistId]">) {
  const { artistId } = await params;
  const [access, artist] = await allInOrder([
    requireApproved(),
    getArtist(artistId),
  ]);
  if (!artist) notFound();
  const t = fr.catalog.artist;
  const canEdit = can(access, "manage_catalog");
  const canArchive = can(access, "archive_records");
  const showBusiness = await showsArtistBusiness(access, artist.id);

  return (
    <SectionFrame
      title={artist.name}
      list={false}
      header={false}
      parent={{ label: shellNav.artists, href: routes.artists }}
      switcher={{
        kind: "artist",
        id: artist.id,
        base: routes.artist(artist.id),
      }}
      className="max-w-5xl"
    >
      <div className="flex flex-col gap-4">
        <PageHeader
          title={artist.name}
          description={[
            fr.catalog.artistPage.kind,
            countryName(artist.countryCode),
          ]
            .filter(Boolean)
            .join(" · ")}
          leading={
            <Avatar
              name={artist.name}
              pictureUrl={artist.pictureUrl}
              className="size-20 rounded-2xl text-[length:var(--type-body-lg)]"
            />
          }
          action={
            canEdit || canArchive ? (
              <div className="flex flex-wrap gap-2">
                {canEdit && (
                  <>
                    <ArtistEditDialog artist={artist} />
                    <Link
                      href={routes.mastersNewForArtist(artist.id)}
                      className={buttonVariants({ size: "lg" })}
                    >
                      <ButtonRoll>
                        <IconPlus aria-hidden data-icon="inline-start" />
                        {t.newMaster}
                      </ButtonRoll>
                    </Link>
                  </>
                )}
                {/* "Modifier" has its own button here: the menu archives. */}
                <ArtistActions
                  artist={{
                    id: artist.id,
                    name: artist.name,
                    masterCount: artist.masters.length,
                  }}
                  rights={{ canEdit: false, canArchive, archived: false }}
                  leaveTo={routes.artists}
                  size="icon-lg"
                />
              </div>
            ) : null
          }
        />
        {artist.deezerUrl && (
          <ExternalLink
            href={artist.deezerUrl}
            icon
            className="w-fit text-sm text-muted-foreground hover:text-foreground"
          >
            {t.openDeezer}
          </ExternalLink>
        )}
      </div>

      <Suspense fallback={null}>
        <ArtistIdentityNow artistId={artist.id} artistName={artist.name} />
      </Suspense>

      <ArtistTabs
        artistId={artist.id}
        hasDeezer={artist.deezerId !== null}
        showBusiness={showBusiness}
      />
      <div className="-mt-2 flex flex-col gap-[var(--section-gap)]">
        {children}
      </div>
    </SectionFrame>
  );
}
