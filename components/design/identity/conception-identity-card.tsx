import { IdentityEditButton } from "@/components/catalog/identity/identity-edit-button";
import { IdentityView } from "@/components/catalog/identity/identity-view";
import {
  AddIdentityRefButton,
  DeviationButton,
  UseIdentityButton,
} from "@/components/design/identity/release-identity-actions";
import { buttonVariants } from "@/components/ui/button";
import { Timestamp } from "@/components/ui/timestamp";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import type { ReleaseIdentity } from "@/lib/design/release-identity";
import { fr } from "@/lib/i18n/fr";
import { formatInstantDay } from "@/lib/utils/instant";

/**
 * The artist's identity on the Conception's home (MKT-C2-04): the version
 * this release uses, read-only, folded; its links can be copied into the
 * release's references (linked to the version); the release's deviation;
 * a newer version to adopt on purpose; « Proposer une évolution de
 * l'identité » — never an edit of the artist's identity from here.
 */
export function ConceptionIdentityCard({
  projectId,
  identity,
  canWrite,
  isOwner,
  open,
  validates,
}: {
  projectId: string;
  identity: ReleaseIdentity;
  // Who writes in the Conception (design_can_write), and its owner.
  canWrite: boolean;
  isOwner: boolean;
  // The Conception is open (design_is_open): its version may change.
  open: boolean;
  // The viewer validates: a proposal of theirs is in force at once.
  validates: boolean;
}) {
  const t = fr.artistIdentity.conception;
  const { used, newer, deviation, artistId } = identity;
  return (
    <section
      aria-labelledby="conception-identity"
      className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-5"
    >
      <h3 id="conception-identity" className="text-body-lg font-semibold">
        {t.title}
      </h3>
      <p className="max-w-prose text-body-md text-muted-foreground">
        {!artistId
          ? t.noArtist
          : used
            ? t.used(
                used.number,
                formatInstantDay(used.decidedAt ?? used.createdAt),
              )
            : t.none}
      </p>
      {newer && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-caption text-muted-foreground">
            {t.newer(newer.number)}
          </span>
          {isOwner && open && (
            <UseIdentityButton
              projectId={projectId}
              versionId={newer.id}
              number={newer.number}
            />
          )}
        </div>
      )}
      {used && (
        <details className="group">
          <summary className="cursor-pointer text-body-md font-medium underline-offset-2 hover:underline">
            {fr.artistIdentity.title} · {fr.artistIdentity.version(used.number)}
          </summary>
          <div className="pt-3">
            <IdentityView
              fields={used}
              refAction={
                canWrite
                  ? (ref) =>
                      identity.copiedUrls.includes(ref.url) ? (
                        <span className="shrink-0 text-caption text-muted-foreground">
                          {t.alreadyAdded}
                        </span>
                      ) : (
                        <AddIdentityRefButton
                          projectId={projectId}
                          versionId={used.id}
                          identityRef={ref}
                        />
                      )
                  : undefined
              }
            />
          </div>
        </details>
      )}
      <div className="flex flex-col gap-1">
        <h4 className="text-body-md font-medium">{t.deviation}</h4>
        <p className="text-body-md text-muted-foreground">
          {deviation ? deviation.text : t.deviationEmpty}
        </p>
        {deviation && (
          <p className="text-caption text-muted-foreground">
            {fr.artistIdentity.by(deviation.byName)}{" "}
            <Timestamp iso={deviation.at} />
          </p>
        )}
      </div>
      {artistId && (
        <div className="flex flex-wrap gap-2">
          <ViewLink
            href={routes.artistIdentity(artistId)}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            {t.see}
          </ViewLink>
          {canWrite && (
            <>
              <DeviationButton
                projectId={projectId}
                current={deviation?.text ?? null}
              />
              <IdentityEditButton
                artistId={artistId}
                projectId={projectId}
                initial={used}
                validates={validates}
                label={t.propose}
                title={t.proposeTitle}
                description={t.proposeBody}
                variant="ghost"
              />
            </>
          )}
        </div>
      )}
    </section>
  );
}
