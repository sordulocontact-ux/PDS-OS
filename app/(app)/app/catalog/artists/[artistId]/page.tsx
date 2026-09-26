import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ArtistContacts } from "@/components/catalog/artist-page/artist-contacts";
import {
  ArtistAutoBio,
  ArtistAutoBioSkeleton,
} from "@/components/catalog/artist-profile/artist-auto-bio";
import { ArtistBio } from "@/components/catalog/artist-profile/artist-bio";
import {
  ArtistHighlights,
  ArtistHighlightsSkeleton,
} from "@/components/catalog/artist-profile/artist-highlights";
import { IconDisc } from "@/components/icons";
import { PageSection } from "@/components/shell/page-section";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableIcon,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
} from "@/components/ui/data-table";
import { FactList } from "@/components/ui/fact-list";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { getArtist, listArtistContacts } from "@/lib/catalog/artist-queries";
import { countryName } from "@/lib/catalog/countries";
import { fr } from "@/lib/i18n/fr";

// Artist overview: key figures, identity, contacts (manage_catalog only:
// the database hides them from everyone else), biography, notes, masters.
export default async function ArtistOverviewPage({
  params,
}: PageProps<"/app/catalog/artists/[artistId]">) {
  const access = await requireApproved();
  const { artistId } = await params;
  const artist = await getArtist(artistId);
  if (!artist) notFound();
  const canEdit = can(access, "manage_catalog");
  const contacts = canEdit ? await listArtistContacts(artist.id) : [];
  const t = fr.catalog.artist;
  const p = fr.catalog.artistPage;

  return (
    <>
      <Suspense fallback={<ArtistHighlightsSkeleton />}>
        <ArtistHighlights
          deezerId={artist.deezerId}
          masterCount={artist.masters.length}
          projectCount={artist.projectCount}
        />
      </Suspense>

      <div className="grid gap-[var(--section-gap)] lg:grid-cols-2 lg:gap-6">
        <PageSection id="identity" title={p.identity}>
          <FactList
            emptyLabel={fr.catalog.notProvided}
            facts={[
              { label: p.stageName, value: artist.name },
              { label: p.legalName, value: artist.legalName },
              { label: p.country, value: countryName(artist.countryCode) },
            ]}
          />
        </PageSection>
        {canEdit && <ArtistContacts artistId={artist.id} contacts={contacts} />}
      </div>

      <PageSection id="bio" title={fr.catalog.deezerProfile.bio.title}>
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
          <DataTable>
            <DataTableHeader>
              <DataTableHead>{fr.catalog.masters.columns.title}</DataTableHead>
              <DataTableHead fill>
                {fr.catalog.masters.columns.artists}
              </DataTableHead>
            </DataTableHeader>
            <DataTableBody>
              {artist.masters.map((master) => (
                <DataTableRow key={master.id}>
                  <DataTableCell>
                    <DataTableMedia
                      visual={<DataTableIcon icon={IconDisc} />}
                      title={
                        <DataTableLink href={routes.master(master.id)}>
                          {master.title}
                        </DataTableLink>
                      }
                      subtitle={master.version}
                    />
                  </DataTableCell>
                  <DataTableCell fill>{master.artists}</DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </PageSection>
    </>
  );
}
