import { IconPlus } from "nucleo-sharp-essential";
import { IconArrowLeft, IconExternalLink } from "@/components/icons";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ArtistAvatar } from "@/components/catalog/artist-avatar";
import {
  ArtistDeezerDetails,
  ArtistDeezerDetailsSkeleton,
} from "@/components/catalog/artist-profile/artist-deezer-details";
import {
  ArtistHighlights,
  ArtistHighlightsSkeleton,
} from "@/components/catalog/artist-profile/artist-highlights";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { PageSection } from "@/components/shell/page-section";
import { buttonVariants } from "@/components/ui/button";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { getArtist } from "@/lib/catalog/queries";
import { masterLabel } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

// Artist page: the catalog's own data (notes, credited masters) and, for an
// artist imported from Deezer, what Deezer knows, streamed in on its own so
// a slow Deezer never holds the page.
export default async function ArtistPage({
  params,
}: PageProps<"/app/catalog/artists/[artistId]">) {
  const access = await requireApproved();
  const { artistId } = await params;
  const artist = await getArtist(artistId);
  if (!artist) notFound();
  const t = fr.catalog.artist;

  return (
    <PageContainer className="max-w-4xl">
      <Link
        href={routes.artists}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <IconArrowLeft className="size-4" aria-hidden />
        {t.back}
      </Link>
      <PageHeader
        title={artist.name}
        leading={
          <ArtistAvatar
            name={artist.name}
            pictureUrl={artist.pictureUrl}
            className="size-16 text-[length:var(--type-body-md)]"
          />
        }
        action={
          can(access, "manage_catalog") ? (
            <Link
              href={routes.mastersNewForArtist(artist.id)}
              className={buttonVariants({ size: "lg" })}
            >
              <IconPlus aria-hidden data-icon="inline-start" />
              {t.newMaster}
            </Link>
          ) : null
        }
      />

      {artist.deezerUrl && (
        <a
          href={artist.deezerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="-mt-2 flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          {t.openDeezer}
          <IconExternalLink className="size-3.5" aria-hidden />
        </a>
      )}

      {artist.deezerId !== null && (
        <Suspense fallback={<ArtistHighlightsSkeleton />}>
          <ArtistHighlights deezerId={artist.deezerId} />
        </Suspense>
      )}

      <PageSection id="notes" title={t.notes}>
        <p
          className={`text-sm whitespace-pre-line ${artist.notes ? "" : "text-muted-foreground"}`}
        >
          {artist.notes ?? t.noNotes}
        </p>
      </PageSection>

      <PageSection id="masters" title={t.masters}>
        {artist.masters.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noMasters}</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {artist.masters.map((master) => (
              <li key={master.id} className="relative px-4 py-3">
                <Link
                  href={routes.master(master.id)}
                  className="text-sm font-medium no-underline after:absolute after:inset-0 hover:underline"
                >
                  {masterLabel(master)}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {master.artists}
                </p>
              </li>
            ))}
          </ul>
        )}
      </PageSection>

      {artist.deezerId !== null && (
        <Suspense fallback={<ArtistDeezerDetailsSkeleton />}>
          <ArtistDeezerDetails deezerId={artist.deezerId} />
        </Suspense>
      )}
    </PageContainer>
  );
}
