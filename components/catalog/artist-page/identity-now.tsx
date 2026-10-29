import { NowFrame } from "@/components/shell/journey/now-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import {
  identityToDecide,
  loadArtistIdentity,
} from "@/lib/catalog/artist-identity";
import { loadMembers } from "@/lib/framing/related";
import { artistIdentity } from "@/lib/i18n/fr/artist-identity";
import { journey } from "@/lib/i18n/fr/journey";
import { myValidationTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";
import { formatInstantDay } from "@/lib/utils/instant";

import { IdentityNowActions } from "./identity-now-actions";

const fr = { artistIdentity, journey };

const secondary =
  "text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]";

/**
 * « Maintenant » of an artist (proto `docs/protos/pages.html`, « Artistes »):
 * shown only when the direction has a proposal of identity to decide — who
 * proposes it, when and what changes, the version in force — with
 * « Approuver » or « Refuser » and its reason written on the spot. Nothing
 * for anyone else, nor for the proposal's own author.
 */
export async function ArtistIdentityNow({
  artistId,
  artistName,
}: {
  artistId: string;
  artistName: string;
}) {
  const access = await requireApproved();
  if (!can(access, "validate")) return null;
  const identity = await loadArtistIdentity(
    artistId,
    await loadMembers(access),
  );
  const proposal = identityToDecide(identity, access.personId);
  if (!proposal) return null;
  const t = fr.artistIdentity.now;
  const current = identity.current;

  return (
    <NowFrame label={fr.journey.now.label}>
      <div className="flex flex-wrap items-center gap-2 text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
        <StatusBadge tone={myValidationTone}>{t.toValidate}</StatusBadge>
        <span>{t.eyebrow(artistName)}</span>
      </div>
      <h2 className="text-[length:var(--type-display-sm)] leading-[var(--type-display-sm-lh)] font-medium tracking-[var(--type-display-tracking)] text-balance">
        {t.title(proposal.number)}
      </h2>
      <p className={cn(secondary, "text-pretty")}>
        {t.why(
          proposal.createdByName,
          formatInstantDay(proposal.createdAt),
          proposal.changeNote,
        )}
      </p>
      <dl className={cn(secondary, "flex flex-wrap gap-1.5")}>
        <dt>{t.inForce} :</dt>
        <dd className="font-semibold text-[color:var(--text-primary)]">
          {current
            ? t.inForceValue(
                current.number,
                formatInstantDay(current.decidedAt ?? current.createdAt),
              )
            : t.noneInForce}
        </dd>
      </dl>
      <IdentityNowActions
        artistId={artistId}
        versionId={proposal.id}
        number={proposal.number}
        author={proposal.createdByName}
      />
    </NowFrame>
  );
}
