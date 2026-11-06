import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ArtistContacts } from "@/components/catalog/artist-page/artist-contacts";
import { ArtistOngoing } from "@/components/catalog/artist-page/artist-ongoing";
import { ArtistTitles } from "@/components/catalog/artist-page/artist-titles";
import {
  ArtistAutoBio,
  ArtistAutoBioSkeleton,
} from "@/components/catalog/artist-profile/artist-auto-bio";
import { ArtistBio } from "@/components/catalog/artist-profile/artist-bio";
import {
  ArtistHighlights,
  ArtistHighlightsSkeleton,
} from "@/components/catalog/artist-profile/artist-highlights";
import { PageSection } from "@/components/shell/page-section";
import { FactList } from "@/components/ui/fact-list";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { loadArtistProgress } from "@/lib/catalog/artist-progress-load";
import { getArtist, listArtistContacts } from "@/lib/catalog/artist-queries";
import { countryName } from "@/lib/catalog/countries";
import { listMasters } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";
import { allInOrder } from "@/lib/utils/parallel";

// Artist overview: first who the artist is — its figures (titles, projects,
// Deezer fans and releases) and its latest releases (Sacha, 29/10: the
// overview before the work) —, then its biography, its titles and their
// audio state, « En cours » (each launched project, where it stands and who
// it waits for, proto `docs/protos/pages.html`) and the notes; beside them
// its identity and contacts (manage_catalog only: the database hides them
// from everyone else).
export default async function ArtistOverviewPage({
  params,
}: PageProps<"/app/catalog/artists/[artistId]">) {
  const { artistId } = await params;
  const accessPromise = requireApproved();
  const artistPromise = getArtist(artistId);
  // Everything read at once, as soon as what it needs is known.
  const [access, artist, contacts, titles, progress] = await allInOrder([
    accessPromise,
    artistPromise,
    accessPromise.then((known) =>
      can(known, "manage_catalog") ? listArtistContacts(artistId) : [],
    ),
    artistPromise.then((found) =>
      listMasters({ ids: found ? found.masters.map((m) => m.id) : [] }),
    ),
    artistPromise.then((found) => loadArtistProgress(found?.projectIds ?? [])),
  ]);
  if (!artist) notFound();
  const canEdit = can(access, "manage_catalog");
  const t = fr.catalog.artist;
  const p = fr.catalog.artistPage;

  return (
    <>
      <Suspense fallback={<ArtistHighlightsSkeleton />}>
        <ArtistHighlights
          deezerId={artist.deezerId}
          artistId={artist.id}
          masterCount={artist.masters.length}
          projectCount={artist.projectIds.length}
        />
      </Suspense>
      <div className="grid items-start gap-[var(--section-gap)] lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-[var(--section-gap)] lg:gap-6">
          <PageSection card id="bio" title={fr.catalog.deezerProfile.bio.title}>
            {artist.bio ? (
              <ArtistBio
                bio={{
                  text: artist.bio,
                  source: "manual",
                  author: null,
                  url: null,
                  lang: "fr",
                }}
              />
            ) : artist.deezerId !== null ? (
              <Suspense fallback={<ArtistAutoBioSkeleton />}>
                <ArtistAutoBio deezerId={artist.deezerId} />
              </Suspense>
            ) : (
              <p className="text-sm text-muted-foreground">
                {fr.catalog.deezerProfile.bio.none}
              </p>
            )}
          </PageSection>
          {artist.notes && (
            <PageSection card id="notes" title={t.notes}>
              <p className="text-sm whitespace-pre-line">{artist.notes}</p>
            </PageSection>
          )}
          {/* Under the bio, not under the identity (Sacha, 06/11/2026). */}
          {canEdit && (
            <ArtistContacts artistId={artist.id} contacts={contacts} />
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-[var(--section-gap)] lg:gap-6">
          <PageSection card id="identity" title={p.identity}>
            <FactList
              emptyLabel={fr.catalog.notProvided}
              facts={[
                { label: p.stageName, value: artist.name },
                {
                  label: p.relation,
                  value: fr.catalog.relation.labels[artist.relation],
                },
                { label: p.legalName, value: artist.legalName },
                { label: p.country, value: countryName(artist.countryCode) },
              ]}
            />
          </PageSection>
        </div>
      </div>
      {/* The tables take the page's whole width, under the identity column
          (Sacha, 06/11/2026: the side column squeezed them). */}
      <ArtistTitles
        artistId={artist.id}
        masters={titles.masters}
        error={titles.error}
        canEdit={canEdit}
      />
      <ArtistOngoing projects={progress.ongoing} error={progress.error} />
    </>
  );
}
