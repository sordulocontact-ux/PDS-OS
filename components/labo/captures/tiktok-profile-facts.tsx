import { formatFans } from "@/lib/catalog/types";
import type { CaptureTikTokProfile } from "@/lib/catalog/capture-artist-types";
import { fr } from "@/lib/i18n/fr";

/**
 * The public TikTok profile of a person read on a screenshot: audience,
 * certification, and the bio as written (quoted, never reworded).
 */
export function TikTokProfileFacts({
  profile,
}: {
  profile: CaptureTikTokProfile;
}) {
  const t = fr.laboCaptures.profile;
  const audience = [
    profile.followers !== null && t.followers(formatFans(profile.followers)),
    profile.videos !== null && t.videos(profile.videos),
    profile.verified && t.verified,
  ].filter(Boolean);

  return (
    <div className="grid gap-1 text-sm">
      {audience.length > 0 && (
        <span className="text-muted-foreground tabular-nums">
          {audience.join(" · ")}
        </span>
      )}
      {profile.bio && (
        <blockquote className="border-l-2 border-[var(--border-hairline)] pl-3 break-words whitespace-pre-line">
          <span className="sr-only">{t.bio} : </span>
          {profile.bio}
        </blockquote>
      )}
    </div>
  );
}
