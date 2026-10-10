// The facts of the Fiche Livrable as Production shows them (durations,
// subtitles, periods): formatting only, by code. Client-safe.

import { fr } from "@/lib/i18n/fr";
import type { HandedFiche } from "@/lib/production/fiche";
import { formatDate } from "@/lib/release/format";

const t = fr.productionPrep.heritage;

const clock = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m} min` : `${m} min ${String(s).padStart(2, "0")} s`;
};

export function ficheDuration(f: HandedFiche): string | null {
  const { durationMinSeconds: min, durationMaxSeconds: max } = f;
  if (min !== null && max !== null && min !== max)
    return t.durationRange(clock(min), clock(max));
  const one = min ?? max;
  return one !== null ? clock(one) : null;
}

export function ficheSubtitles(f: HandedFiche): string | null {
  if (f.subtitles === null) return null;
  if (!f.subtitles) return t.subtitlesNo;
  const mode = f.subtitleMode
    ? t.subtitleModes[f.subtitleMode as keyof typeof t.subtitleModes]
    : null;
  return [t.subtitlesYes, f.subtitleRatios.join(", ") || null, mode ?? null]
    .filter(Boolean)
    .join(" · ");
}

export function fichePeriod(from: string | null, to: string | null) {
  if (from && to) return t.period(formatDate(from), formatDate(to));
  return from ? formatDate(from) : to ? formatDate(to) : null;
}
