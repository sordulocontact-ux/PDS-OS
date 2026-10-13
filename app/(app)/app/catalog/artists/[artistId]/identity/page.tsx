import { notFound } from "next/navigation";

import { IdentityEditButton } from "@/components/catalog/identity/identity-edit-button";
import { IdentityHistory } from "@/components/catalog/identity/identity-history";
import { IdentityView } from "@/components/catalog/identity/identity-view";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { loadArtistIdentity } from "@/lib/catalog/artist-identity";
import { getArtist } from "@/lib/catalog/artist-queries";
import { loadMembers } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { formatInstantDay } from "@/lib/utils/instant";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.artistIdentity.title} · ${fr.app.name}`,
};

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
  const members = await loadMembers(access);
  const identity = await loadArtistIdentity(artistId, members);
  const t = fr.artistIdentity;
  const validates = can(access, "validate");
  // An archived artist is refused by the database (propose_artist_identity).
  const canWrite =
    can(access, "manage_catalog") || can(access, "creative_work");
  const current = identity.current;
  const pending = identity.versions.filter((v) => v.status === "proposed");

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

      {pending.length > 0 && (
        <PageSection id="identity-pending" title={t.pendingTitle}>
          <IdentityHistory
            artistId={artistId}
            versions={pending}
            canDecide={validates}
            meId={access.personId}
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
