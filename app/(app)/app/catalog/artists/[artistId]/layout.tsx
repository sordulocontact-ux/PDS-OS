import { IconPlus } from "nucleo-sharp-essential";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArtistAvatar } from "@/components/catalog/artist-avatar";
import { ArtistEditSheet } from "@/components/catalog/artist-page/artist-edit-sheet";
import { ArtistTabs } from "@/components/catalog/artist-page/artist-tabs";
import { ExternalLink } from "@/components/catalog/artist-profile/external-link";
import { IconArrowLeft } from "@/components/icons";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { getArtist } from "@/lib/catalog/artist-queries";
import { countryName } from "@/lib/catalog/countries";
import { fr } from "@/lib/i18n/fr";

// Artist frame: header (picture, name, actions) and section tabs. Pages
// below check access themselves (a layout does not re-run on client
// navigation); getArtist is cached per request, so they reuse it.
export default async function ArtistLayout({
  children,
  params,
}: LayoutProps<"/app/catalog/artists/[artistId]">) {
  const access = await requireApproved();
  const { artistId } = await params;
  const artist = await getArtist(artistId);
  if (!artist) notFound();
  const t = fr.catalog.artist;
  const canEdit = can(access, "manage_catalog");

  return (
    <PageContainer className="max-w-5xl">
      <Link
        href={routes.artists}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <IconArrowLeft className="size-4" aria-hidden />
        {t.back}
      </Link>

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
            <ArtistAvatar
              name={artist.name}
              pictureUrl={artist.pictureUrl}
              className="size-20 rounded-2xl text-[length:var(--type-body-lg)]"
            />
          }
          action={
            canEdit ? (
              <div className="flex flex-wrap gap-2">
                <ArtistEditSheet artist={artist} />
                <Link
                  href={routes.mastersNewForArtist(artist.id)}
                  className={buttonVariants({ size: "lg" })}
                >
                  <IconPlus aria-hidden data-icon="inline-start" />
                  {t.newMaster}
                </Link>
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

      <ArtistTabs artistId={artist.id} hasDeezer={artist.deezerId !== null} />
      <div className="-mt-2 flex flex-col gap-[var(--section-gap)]">
        {children}
      </div>
    </PageContainer>
  );
}
