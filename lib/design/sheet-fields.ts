// Fiche Livrable (ticket « Conception » § 10): its fields, where each value
// comes from, and the small conversions the form needs (duration, money).
// Same columns as public.design_sheets. Client-safe.

// The fields a person writes (provenance is tracked for each of them).
export const SHEET_FIELDS = [
  "title",
  "concept",
  "intention",
  "duration",
  "ratios",
  "subtitles",
  "variants",
  "notes",
  "constraints",
  "shoot_date",
  "post_start",
  "post_deadline",
  "delivery_date",
  "budget",
  "dependencies",
  "production_notes",
  // The format of a cover or a visual (« 3000 × 3000 px, JPG ou PNG »).
  "file_format",
] as const;
export type SheetField = (typeof SHEET_FIELDS)[number];

// Where a value comes from: the validated Stratégie, a confirmed intention,
// a call, a person, a file, or a suggestion of PO the person accepted.
export const PROVENANCE_SOURCES = [
  "strategy",
  "intention",
  "call",
  "manual",
  "file",
  "suggestion",
] as const;
export type ProvenanceSource = (typeof PROVENANCE_SOURCES)[number];
export type SheetProvenance = Partial<
  Record<SheetField, { source: ProvenanceSource; detail?: string }>
>;

export function toProvenance(value: unknown): SheetProvenance {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: SheetProvenance = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!(SHEET_FIELDS as readonly string[]).includes(key)) continue;
    const source =
      raw && typeof raw === "object" && "source" in raw ? raw.source : null;
    if (
      typeof source === "string" &&
      (PROVENANCE_SOURCES as readonly string[]).includes(source)
    ) {
      const detail = "detail" in raw ? raw.detail : undefined;
      out[key as SheetField] = {
        source: source as ProvenanceSource,
        ...(typeof detail === "string" ? { detail } : {}),
      };
    }
  }
  return out;
}

// Ratios offered in one click; any other is typed by a person.
export const RATIO_PRESETS = ["16:9", "9:16", "1:1", "4:5"] as const;

export function isRatio(value: string): boolean {
  return /^\d{1,2}(\.\d{1,2})?:\d{1,2}(\.\d{1,2})?$/.test(value.trim());
}

export const SUBTITLE_MODES = ["burned", "file", "both"] as const;
export type SubtitleMode = (typeof SUBTITLE_MODES)[number];

/** "3:00", "3 min", "180" (seconds) → seconds; null if unreadable. */
export function parseDuration(value: string): number | null {
  const text = value.trim().toLowerCase();
  if (!text) return null;
  const clock = /^(\d{1,3}):([0-5]\d)$/.exec(text);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const minutes = /^(\d{1,3})\s*min$/.exec(text);
  if (minutes) return Number(minutes[1]) * 60;
  const seconds = /^(\d{1,5})\s*s?$/.exec(text);
  return seconds ? Number(seconds[1]) : null;
}

/** Seconds → "3:00". */
export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "";
  const s = seconds % 60;
  return `${Math.floor(seconds / 60)}:${String(s).padStart(2, "0")}`;
}

/** "2 000", "2000,50", "2 000 €" → cents; null if unreadable. */
export function parseEuros(value: string): number | null {
  const text = value.replace(/[\s €]/g, "").replace(",", ".");
  if (!text) return null;
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(text)) return null;
  return Math.round(Number(text) * 100);
}

/** Cents → "2 000" (euros, two decimals only when needed). */
export function formatEuros(cents: number | null): string {
  if (cents === null) return "";
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
