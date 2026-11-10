import { notFound } from "next/navigation";

import { IdentityEditButton } from "@/components/catalog/identity/identity-edit-button";
import { IdentityHistory } from "@/components/catalog/identity/identity-history";
import { IdentityMoodboards } from "@/components/catalog/identity/identity-moodboards";
import { IdentityView } from "@/components/catalog/identity/identity-view";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import {
  identityToDecide,
  loadArtistIdentity,
} from "@/lib/catalog/artist-identity";
import { getArtist } from "@/lib/catalog/artist-queries";
import { CREATIVE_ARTIST_CATEGORIES } from "@/lib/catalog/file-rules";
import { listCatalogFiles } from "@/lib/catalog/files";
import { listArtistMoodboards } from "@/lib/catalog/moodboards";
import { loadMembers } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { figmaReady } from "@/lib/integrations/figma";
import { formatInstantDay } from "@/lib/utils/instant";
import { allInOrder } from "@/lib/utils/parallel";

// Under the artist's template (« Nova · Identité · PDS OS »).
export const metadata = { title: fr.artistIdentity.tab };

// « Importer depuis Figma » renders and stores a board's images: a server
// action of this page may take a while.
export const maxDuration = 300;

/**
 * The artist's identity (MKT-C2-04): the version in force, read by every
 * release of the artist; « Modifier l'identité » for catalog managers and
 * creative directors (a validator's version is in force at once, the
 * others' proposed to the DG); the proposals to decide and every version.
 */
export default async function ArtistIdentityPage({
  params,
}: PageProps<"/app/catalog/artists/[artistId]/identity">) {
  const { artistId } = await params;
  const [access, artist] = await allInOrder([
    requireApproved(),
    getArtist(artistId),
  ]);
  if (!artist) notFound();
  const [members, library] = await Promise.all([
    loadMembers(access),
    listCatalogFiles({ kind: "artist", id: artistId }),
  ]);
  // The artistic director's pistes (retours du 31/10 et du 10/11/2026):
  // folders holding the artist's files of that category; a creative
  // director edits or deletes his own only.
  const [identity, { moodboards, loose }] = await Promise.all([
    loadArtistIdentity(artistId, members),
    listArtistMoodboards(artistId, library.files),
  ]);
  const manages = can(access, "manage_catalog");
  const moodboardScope =
    !manages && can(access, "creative_work") && access.personId
      ? { categories: CREATIVE_ARTIST_CATEGORIES, personId: access.personId }
      : null;
  const t = fr.artistIdentity;
  const validates = can(access, "validate");
  // An archived artist is refused by the database (propose_artist_identity).
  const canWrite =
    can(access, "manage_catalog") || can(access, "creative_work");
  const current = identity.current;
  const pending = identity.versions.filter((v) => v.status === "proposed");
  // Decided in the artist's « Maintenant », above the tabs.
  const nowId = validates
    ? (identityToDecide(identity, access.personId)?.id ?? null)
    : null;

  return (
    <div className="flex flex-col gap-8">
      <PageSection
        id="identity-current"
        title={t.title}
        description={t.intro}
        action={
          canWrite && (
            <IdentityEditButton
              artistId={artistId}
              initial={current}
              validates={validates}
              label={current ? t.edit : t.write}
              title={t.editTitle}
              description={t.editBody(validates)}
              variant={current ? "outline" : "default"}
            />
          )
        }
      >
        {current ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="success" size="sm">
                {t.current}
              </StatusBadge>
              <span className="text-caption text-muted-foreground">
                {t.versionLine(
                  current.number,
                  formatInstantDay(current.decidedAt ?? current.createdAt),
                )}
              </span>
            </div>
            <IdentityView fields={current} />
          </div>
        ) : (
          <EmptyNote>
            {t.empty} {canWrite ? t.emptyHint : null}
          </EmptyNote>
        )}
      </PageSection>

      <PageSection
        id="identity-moodboards"
        title={t.moodboards.title}
        description={t.moodboards.description}
      >
        <IdentityMoodboards
          artistId={artistId}
          moodboards={moodboards}
          loose={loose}
          organizationId={
            manages || moodboardScope ? artist.organizationId : null
          }
          scope={moodboardScope}
          figma={figmaReady()}
        />
      </PageSection>

      {pending.length > 0 && (
        <PageSection id="identity-pending" title={t.pendingTitle}>
          <IdentityHistory
            artistId={artistId}
            versions={pending}
            canDecide={validates}
            meId={access.personId}
            nowId={nowId}
          />
        </PageSection>
      )}

      {identity.versions.length > 0 && (
        <PageSection
          id="identity-history"
          title={t.historyTitle}
          collapsible
          defaultOpen={false}
        >
          <IdentityHistory
            artistId={artistId}
            versions={identity.versions.filter((v) => v.status !== "proposed")}
            canDecide={false}
            meId={access.personId}
          />
        </PageSection>
      )}
    </div>
  );
}
