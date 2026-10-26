// The platforms of a release (ticket « Distribution » § 6.11, § 12, CA10,
// CA16): the five of reference, then any added by name. Public availability
// is « vérifiée » only once a person verified every platform of reference;
// a declaration never counts as a verification. Pure.

import { fr } from "@/lib/i18n/fr";
import type { Platform as DetectedPlatform } from "@/lib/release/platforms";

export const REFERENCE_PLATFORMS = [
  "spotify",
  "apple_music",
  "deezer",
  "youtube_music",
  "amazon_music",
] as const;
export type ReferencePlatform = (typeof REFERENCE_PLATFORMS)[number];

export const isReferencePlatform = (
  value: string,
): value is ReferencePlatform =>
  (REFERENCE_PLATFORMS as readonly string[]).includes(value);

// The detection's names (lib/release/platforms.ts) for the same services.
const DETECTED: Partial<Record<DetectedPlatform, ReferencePlatform>> = {
  spotify: "spotify",
  appleMusic: "apple_music",
  deezer: "deezer",
  youtubeMusic: "youtube_music",
  amazonMusic: "amazon_music",
};

export const referenceOfDetected = (
  platform: string,
): ReferencePlatform | null => DETECTED[platform as DetectedPlatform] ?? null;

export const VERIFICATIONS = ["unchecked", "verified", "unavailable"] as const;
export type Verification = (typeof VERIFICATIONS)[number];
export const COMPLIANCES = ["unchecked", "compliant", "non_compliant"] as const;
export type Compliance = (typeof COMPLIANCES)[number];

export type PlatformView = {
  platform: string;
  // A platform added by hand has its own name.
  label: string | null;
  reference: boolean;
  url: string | null;
  declared: { at: string; by: string | null } | null;
  verification: Verification;
  verificationNote: string | null;
  verified: { at: string; by: string | null } | null;
  compliance: Compliance;
  complianceNote: string | null;
  complianced: { at: string; by: string | null } | null;
  // What the person saw when verifying (recette DIST-005): the territory,
  // the day, and the proof (a capture, signed for an hour, or a link).
  territory: string | null;
  observedOn: string | null;
  proof: { name: string; href: string | null } | null;
  proofUrl: string | null;
  // A link the automatic detection found: proposed with its source (rule
  // 1), never a verification until a person says « Tout est bon ».
  suggestion: string | null;
  // When the detection found it.
  suggestedAt: string | null;
  // The link saved is the one the detection found.
  fromDetection: string | null;
};

const empty = (platform: string): PlatformView => ({
  platform,
  label: null,
  reference: true,
  url: null,
  declared: null,
  verification: "unchecked",
  verificationNote: null,
  verified: null,
  compliance: "unchecked",
  complianceNote: null,
  complianced: null,
  territory: null,
  observedOn: null,
  proof: null,
  proofUrl: null,
  suggestion: null,
  suggestedAt: null,
  fromDetection: null,
});

/** The five of reference (blank until written), then the added ones. */
export function platformsOf(
  rows: PlatformView[],
  detected: Array<{ platform: string; url: string; first_seen_at?: string }>,
): PlatformView[] {
  const linkOf = (platform: string) =>
    detected.find((link) => referenceOfDetected(link.platform) === platform) ??
    null;
  const withSuggestion = (row: PlatformView): PlatformView => {
    const link = linkOf(row.platform);
    const same = link !== null && link.url === row.url;
    return {
      ...row,
      suggestion: link && !same && !row.url ? link.url : null,
      suggestedAt: link?.first_seen_at ?? null,
      fromDetection: same ? (link.first_seen_at ?? null) : null,
    };
  };
  return [
    ...REFERENCE_PLATFORMS.map((platform) =>
      withSuggestion(
        rows.find((row) => row.platform === platform) ?? empty(platform),
      ),
    ),
    ...rows.filter((row) => !isReferencePlatform(row.platform)),
  ];
}

// not_declared → declared → partially_verified → verified (§ 7).
export type Availability =
  "not_declared" | "declared" | "partially_verified" | "verified";

export function availabilityOf(input: {
  // « Disponibilité publique déclarée » in the current cycle.
  declared: boolean;
  platforms: PlatformView[];
}): {
  state: Availability;
  verified: number;
  reference: number;
  withoutLink: number;
} {
  const reference = input.platforms.filter((p) => p.reference);
  // Verified means available and compliant: a platform found non
  // compliant is never counted as verified (recette DIST-005).
  const verified = reference.filter(
    (p) => p.verification === "verified" && p.compliance === "compliant",
  ).length;
  const anyVerified = input.platforms.some(
    (p) => p.verification === "verified",
  );
  const anyDeclared =
    input.declared || input.platforms.some((p) => p.declared !== null);
  const state: Availability =
    reference.length > 0 && verified === reference.length
      ? "verified"
      : anyVerified
        ? "partially_verified"
        : anyDeclared
          ? "declared"
          : "not_declared";
  return {
    state,
    verified,
    reference: reference.length,
    withoutLink: reference.filter((p) => !p.url).length,
  };
}

/** « Spotify », or the name given to a platform added by hand. */
export const platformLabel = (platform: {
  platform: string;
  label: string | null;
}): string =>
  isReferencePlatform(platform.platform)
    ? fr.distribution.platforms.names[platform.platform]
    : (platform.label ?? platform.platform);
