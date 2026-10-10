import { DeezerAccountCard } from "@/components/labo/captures/deezer-account-card";
import { SocialLinks } from "@/components/labo/captures/social-links";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  CaptureArtist,
  DeezerMatchStatus,
} from "@/lib/catalog/capture-artist-types";
import { fr } from "@/lib/i18n/fr";

const MATCH_TONE = {
  linked: "success",
  single: "warning",
  several: "warning",
  none: "neutral",
} as const satisfies Record<DeezerMatchStatus, string>;

/**
 * One person read on a screenshot: the names PO grouped and why, then the
 * Deezer account the code found (or the homonyms to choose from).
 */
export function CaptureArtistRow({ artist }: { artist: CaptureArtist }) {
  const t = fr.laboCaptures;
  const { account } = artist;
  const shownName = account?.name ?? artist.artistName;
  const aliases = artist.names.filter((n) => n !== shownName);
  const why =
    artist.status === "linked"
      ? t.matchWhy.linked(
          (account?.evidence ?? []).map((e) => `« ${e} »`).join(", "),
        )
      : t.matchWhy[artist.status];

  return (
    <li className="grid gap-3 border-t border-[var(--border-hairline)] pt-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-lg font-semibold">{shownName}</span>
        <StatusBadge tone="neutral" size="sm">
          {t.role[artist.role]}
        </StatusBadge>
        <StatusBadge tone={MATCH_TONE[artist.status]} size="sm">
          {t.match[artist.status]}
        </StatusBadge>
      </div>
      {aliases.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {t.alsoKnownAs(aliases.join(", "))}
          {account && artist.artistName !== account.name && (
            <> · {t.proposedName(artist.artistName)}</>
          )}
        </p>
      )}

      {account && <DeezerAccountCard account={account} />}
      <p className="text-sm">{why}</p>
      <SocialLinks
        tiktok={artist.tiktok}
        instagram={artist.instagram}
        spotify={artist.spotify}
      />

      {artist.others.length > 0 && (
        <div className="grid gap-2">
          {account && (
            <span className="text-sm text-muted-foreground">
              {t.otherAccounts}
            </span>
          )}
          <ul className="grid gap-2">
            {artist.others.map((other) => (
              <li key={other.deezerId}>
                <DeezerAccountCard account={other} compact />
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className="text-sm text-muted-foreground">
        <summary className="cursor-pointer select-none">{t.reasoning}</summary>
        <p className="mt-1">{artist.reasoning}</p>
      </details>
    </li>
  );
}
