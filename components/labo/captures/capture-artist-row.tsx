"use client";

import { useState } from "react";

import { CaptureNetworkAction } from "@/components/labo/captures/capture-network-action";
import { DeezerAccountCard } from "@/components/labo/captures/deezer-account-card";
import { DeezerChooser } from "@/components/labo/captures/deezer-chooser";
import { proofSentences } from "@/components/labo/captures/deezer-proofs";
import { SocialLinks } from "@/components/labo/captures/social-links";
import { TikTokProfileFacts } from "@/components/labo/captures/tiktok-profile-facts";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ChosenDeezer } from "@/lib/catalog/capture-actions";
import type {
  CaptureArtist,
  DeezerMatchStatus,
  SocialLink,
} from "@/lib/catalog/capture-artist-types";
import { laboCaptures } from "@/lib/i18n/fr/labo-captures";
import { rolesText } from "@/lib/network/types";

const fr = { laboCaptures };

const MATCH_TONE = {
  linked: "success",
  single: "warning",
  several: "warning",
  none: "neutral",
  chosen: "success",
} as const satisfies Record<DeezerMatchStatus, string>;

/**
 * One person read on a screenshot: the names PO grouped and why, what they
 * do (artist, beatmaker), their TikTok profile, the Deezer account the code
 * found and its proofs, their networks and e-mail, their profile picture
 * (`withPicture`, for a screenshot's people); then « Ajouter au
 * Réseau ». Homonyms left undecided are chosen here (`DeezerChooser`): the
 * choice is kept in the page, and the form to the Réseau takes it.
 */
export function CaptureArtistRow({
  artist: read,
  canAddToNetwork,
  withPicture,
}: {
  artist: CaptureArtist;
  canAddToNetwork: boolean;
  withPicture: boolean;
}) {
  const t = fr.laboCaptures;
  const [artist, setArtist] = useState(read);
  const { account, activity } = artist;
  const shownName = account?.name ?? artist.artistName;
  const aliases = artist.names.filter((n) => n !== shownName);
  const why =
    artist.status === "linked"
      ? proofSentences(account!).join(" ")
      : t.matchWhy[artist.status];

  return (
    <li className="grid gap-3 border-t border-[var(--border-hairline)] pt-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-2">
        {withPicture && artist.picture && (
          <Avatar
            name={shownName}
            pictureUrl={artist.picture.url}
            className="size-10"
          />
        )}
        <span className="text-lg font-semibold">{shownName}</span>
        <StatusBadge tone="neutral" size="sm">
          {t.role[artist.role]}
        </StatusBadge>
        <StatusBadge tone={MATCH_TONE[artist.status]} size="sm">
          {t.match[artist.status]}
        </StatusBadge>
        <span className="ml-auto">
          <CaptureNetworkAction artist={artist} canAdd={canAddToNetwork} />
        </span>
      </div>
      <p className="text-sm">
        <span className="font-semibold">{rolesText(activity.roles)}</span>
        <span className="text-muted-foreground">
          {" "}
          ·{" "}
          {activity.clue
            ? t.activity.clue(
                activity.clue.text,
                t.activity.where[activity.clue.source],
              )
            : t.activity.po}
        </span>
      </p>
      {aliases.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {t.alsoKnownAs(aliases.join(", "))}
          {account && artist.artistName !== account.name && (
            <> · {t.proposedName(artist.artistName)}</>
          )}
        </p>
      )}

      {artist.profile && <TikTokProfileFacts profile={artist.profile} />}
      {account && <DeezerAccountCard account={account} />}
      <p className="text-sm">{why}</p>
      <SocialLinks
        tiktok={artist.tiktok}
        instagram={artist.instagram}
        spotify={artist.spotify}
        email={artist.email}
      />

      <DeezerChooser
        // Reset once a choice is made: closed on the new account.
        key={account?.deezerId ?? "none"}
        artist={artist}
        onChosen={(chosen) => setArtist((current) => choose(current, chosen))}
      />

      {/* Empty when PO did not answer (quota, provider down). */}
      {artist.reasoning && (
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer select-none">
            {t.reasoning}
          </summary>
          <p className="mt-1">{artist.reasoning}</p>
        </details>
      )}
    </li>
  );
}

// Networks found through the previous account (MusicBrainz, Wikidata) go
// with it; those read on the screenshot, TikTok or Linktree stay.
const ownLink = (link: SocialLink | null) =>
  link && link.source !== "musicbrainz" && link.source !== "wikidata"
    ? link
    : null;

function choose(
  current: CaptureArtist,
  chosen: Extract<ChosenDeezer, { ok: true }>,
): CaptureArtist {
  const id = chosen.account.deezerId;
  const all = current.account
    ? [current.account, ...current.others]
    : current.others;
  const known = all.find((a) => a.deezerId === id);
  return {
    ...current,
    status: "chosen",
    // Proofs and bio already read stay with the account.
    account: known
      ? { ...known, existing: chosen.account.existing }
      : chosen.account,
    others: all.filter((a) => a.deezerId !== id),
    suggestion: null,
    tiktok: ownLink(current.tiktok) ?? chosen.socials.tiktok,
    instagram: ownLink(current.instagram) ?? chosen.socials.instagram,
    spotify: ownLink(current.spotify) ?? chosen.socials.spotify,
    contact: current.contact ?? chosen.contact,
    // A picture of the previous account goes with it.
    picture:
      chosen.picture ??
      (current.picture?.source === "tiktok" ||
      current.picture?.source === "instagram"
        ? current.picture
        : null),
  };
}
