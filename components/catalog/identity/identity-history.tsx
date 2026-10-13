import { IdentityDecision } from "@/components/catalog/identity/identity-decision";
import { IdentityView } from "@/components/catalog/identity/identity-view";
import { StatusBadge } from "@/components/ui/status-badge";
import { Timestamp } from "@/components/ui/timestamp";
import type { IdentityVersion } from "@/lib/catalog/artist-identity";
import { formatInstantDay } from "@/lib/utils/instant";
import { fr } from "@/lib/i18n/fr";
import { identityStatusTone } from "@/lib/ui/state-tones";

/**
 * The versions of the artist's identity, newest first (MKT-C2-04): status,
 * who wrote it and when, how long it was in force, what changed, the
 * decision; each folded to its line, unfolded on demand. A proposal waiting
 * shows « Approuver » / « Refuser » to a validator who did not write it.
 */
export function IdentityHistory({
  artistId,
  versions,
  canDecide,
  meId,
}: {
  artistId: string;
  versions: IdentityVersion[];
  canDecide: boolean;
  meId: string | null;
}) {
  const t = fr.artistIdentity;
  return (
    <ul className="flex flex-col gap-2">
      {versions.map((v) => (
        <li key={v.id}>
          <details
            className="group rounded-xl border border-border bg-background"
            open={v.status === "proposed"}
          >
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 rounded-xl px-4 py-3 hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
              <span className="text-body-md font-semibold tabular-nums">
                {t.version(v.number)}
              </span>
              <StatusBadge tone={identityStatusTone[v.status]} size="sm">
                {t.statuses[v.status]}
              </StatusBadge>
              <span className="text-caption text-muted-foreground">
                {t.by(v.createdByName)} <Timestamp iso={v.createdAt} />
              </span>
              {v.status === "approved" && v.decidedAt && (
                <span className="text-caption text-muted-foreground">
                  {t.inForce(
                    formatInstantDay(v.decidedAt),
                    v.validUntil ? formatInstantDay(v.validUntil) : null,
                  )}
                </span>
              )}
            </summary>
            <div className="flex flex-col gap-4 px-4 pt-1 pb-4">
              {v.changeNote && (
                <p className="text-body-md">
                  {t.changeNote} : {v.changeNote}
                </p>
              )}
              {v.projectId && (
                <p className="text-caption text-muted-foreground">
                  {t.fromProject}
                </p>
              )}
              <IdentityView fields={v} />
              {v.decisionComment && (
                <p className="text-caption text-muted-foreground">
                  {t.decision(v.decisionComment)}
                </p>
              )}
              {v.status === "proposed" &&
                canDecide &&
                (v.createdBy === meId ? (
                  <p className="text-caption text-muted-foreground">
                    {t.ownProposal}
                  </p>
                ) : (
                  <IdentityDecision artistId={artistId} versionId={v.id} />
                ))}
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
