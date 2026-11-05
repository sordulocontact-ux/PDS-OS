import type { CaptureArtist } from "@/lib/catalog/capture-artist-types";
import { formatFans } from "@/lib/catalog/types";
import { laboCaptures } from "@/lib/i18n/fr/labo-captures";
import { asHandle, parseSpotifyId } from "@/lib/network/socials";
import type { NetworkContactValues } from "@/lib/network/types";
import { formatDate } from "@/lib/release/format";

const fr = { laboCaptures };

const NOTES_MAX = 2000;
const WEBSITE_MAX = 500;

/**
 * A person read on a TikTok screenshot (Labo), as a new contact of the
 * Réseau: what the code found, pre-filling the real contact form that a
 * person reviews and saves (never saved by itself). The notes are written
 * by the code: when and how the artist was spotted, the audience, the bio
 * as read. A Deezer account only when the code is fairly sure of it.
 */
export function captureContact(
  artist: CaptureArtist,
  today: Date,
): Partial<Omit<NetworkContactValues, "id">> {
  const t = fr.laboCaptures.network.notes;
  const { account, profile } = artist;
  // Found with a proof, the only one of its name, or chosen by a person.
  const sure =
    artist.status === "linked" ||
    artist.status === "single" ||
    artist.status === "chosen";
  const handle = (label: string | undefined) =>
    asHandle(label?.replace(/^@/, ""))?.toLowerCase() ?? null;

  const notes = [
    t.spotted(
      // A shared Instagram link: spotted on Instagram, not on TikTok.
      artist.instagram?.source === "link" ? "Instagram" : "TikTok",
      formatDate(today.toISOString()),
      t.role[artist.role],
    ),
    profile &&
      (profile.followers !== null || profile.videos !== null) &&
      t.tiktok(
        profile.followers !== null ? formatFans(profile.followers) : null,
        profile.videos,
      ),
    account && sure && t.deezer(formatFans(account.fans), account.releaseCount),
    profile?.bio && t.bio(profile.bio),
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, NOTES_MAX);

  const bioLink = profile?.bioLink ?? null;
  return {
    kind: "person",
    name: (sure && account?.name) || artist.artistName,
    roles: artist.activity.roles,
    email: artist.email?.value ?? null,
    website: bioLink && bioLink.length <= WEBSITE_MAX ? bioLink : null,
    notes,
    tiktok: handle(artist.tiktok?.label),
    instagram: handle(artist.instagram?.label),
    spotifyId: artist.spotify ? parseSpotifyId(artist.spotify.url) : null,
    deezerId: sure && account ? account.deezerId : null,
    // The catalog artist already on that Deezer profile, if any.
    ...(sure && account?.existing ? { artistId: account.existing.id } : {}),
  };
}
