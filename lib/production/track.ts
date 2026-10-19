// Which journey a deliverable's production follows (proto « Projet
// complet » prodSteps, PR-13): the shoot's (clip, internal teasers), the
// light one of a cover (Versions → Contrôle technique → Livraison), or the
// light one of teasers drawn from the clip. Read from the deliverable's
// title — the Distribution's own rule for the cover (distribution_cover) —
// and from the sheet. Pure, client-safe.

export type ProductionTrack = "shoot" | "artwork" | "derived";

export const isArtworkTitle = (title: string) =>
  /(pochette|cover|artwork)/i.test(title);

/** Teasers or excerpts: may be drawn from the clip. */
export const isTeaserTitle = (title: string) => /(teaser|extrait)/i.test(title);

export const isClipTitle = (title: string) => /clip/i.test(title);

export function trackOf(
  title: string,
  derivedFrom: string | null,
): ProductionTrack {
  if (derivedFrom) return "derived";
  return isArtworkTitle(title) ? "artwork" : "shoot";
}

// The cover's rules, checked by code on the validated file (proto
// lightBody « Contrôlé par le code »; the weight: docs/PRODUCTION-METIER.md
// § 12, a decision of this lot).
export const COVER_SIDE = 3000;
export const COVER_MAX_BYTES = 10 * 1024 * 1024;
const COVER_MIMES = ["image/jpeg", "image/png"];

export type CoverFile = {
  width: number | null;
  height: number | null;
  mime: string | null;
  bytes: number | null;
};

export type CoverCheck = {
  key: "size" | "format" | "square" | "weight";
  ok: boolean;
  // What the code read (« 3000 × 3000 px », « JPG », « 2,4 Mo »).
  value: string;
};

const mo = (bytes: number) =>
  `${(bytes / (1024 * 1024)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;

export function coverChecks(f: CoverFile): CoverCheck[] {
  const sized = f.width !== null && f.height !== null;
  return [
    {
      key: "size",
      ok: f.width === COVER_SIDE && f.height === COVER_SIDE,
      value: sized ? `${f.width} × ${f.height} px` : "—",
    },
    {
      key: "format",
      ok: COVER_MIMES.includes(f.mime ?? ""),
      value: (f.mime ?? "—").replace("image/", "").toUpperCase(),
    },
    {
      key: "square",
      ok: sized && f.width === f.height,
      // Said by the component (« Oui » / « Non »).
      value: sized ? "" : "—",
    },
    {
      key: "weight",
      ok: f.bytes !== null && f.bytes <= COVER_MAX_BYTES,
      value: f.bytes !== null ? mo(f.bytes) : "—",
    },
  ];
}
