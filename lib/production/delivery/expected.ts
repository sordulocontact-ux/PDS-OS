// What the Fiche Livrable expects of the final files, worded for the
// checklist: one line per expected file (lib/production/logistics.ts) and the
// facts that guide the check. Read from the Fiche, never guessed. Client-safe.

import { productionClosure } from "@/lib/i18n/fr/production-closure";
import { productionDelivery } from "@/lib/i18n/fr/production-delivery";
import {
  orientationOf,
  type ExportCheckKind,
} from "@/lib/production/delivery/rules";
import type { HandedFiche } from "@/lib/production/fiche";
import { expectedExports } from "@/lib/production/logistics";

const fr = { productionDelivery, productionClosure };

const t = fr.productionDelivery.checklist;
const s = fr.productionClosure.spec;

/** The expected lines, labelled in French (« Export horizontal 16:9 »…),
 * each with what is expected of it; what the Fiche does not say is marked
 * « à confirmer » (PROD-035). */
export function expectedLines(
  fiche: HandedFiche | null,
): { label: string; kind: ExportCheckKind; spec: string }[] {
  return expectedExports(fiche).map((line) => {
    if (line.kind === "subtitles")
      return {
        label: t.labels.subtitles(fiche?.subtitleMode ?? null),
        kind: line.kind,
        spec: specOf([
          subtitlesOf(fiche),
          fiche && fiche.subtitleRatios.length > 0
            ? s.subtitleRatios(fiche.subtitleRatios)
            : null,
          s.languageMissing,
        ]),
      };
    if (line.kind === "qc")
      return { label: t.labels.qc, kind: line.kind, spec: s.qc };
    const orientation = orientationOf(line.label);
    return {
      label: t.labels.export(
        orientation ? t.labels.orientations[orientation] : null,
        line.label,
      ),
      kind: line.kind,
      spec: specOf([
        line.label,
        durationOf(fiche),
        subtitlesOf(fiche, line.label),
      ]),
    };
  });
}

const specOf = (parts: (string | null)[]) => parts.filter(Boolean).join(" · ");

function durationOf(fiche: HandedFiche | null): string {
  const min = clock(fiche?.durationMinSeconds ?? null);
  const max = clock(fiche?.durationMaxSeconds ?? null);
  return min || max
    ? s.duration(t.expected.durationRange(min, max))
    : s.durationMissing;
}

/** The subtitles a file carries; for an export, only when the Fiche puts
 * them on its ratio (no ratio listed: on every one). */
function subtitlesOf(fiche: HandedFiche | null, ratio?: string): string {
  if (!fiche || fiche.subtitles === null) return s.subtitles.unknown;
  if (!fiche.subtitles) return s.subtitles.off;
  if (
    ratio &&
    fiche.subtitleRatios.length > 0 &&
    !fiche.subtitleRatios.includes(ratio)
  )
    return s.subtitles.off;
  return (
    (fiche.subtitleMode ? s.subtitles[fiche.subtitleMode] : null) ??
    s.subtitles.on
  );
}

function clock(seconds: number | null): string | null {
  if (seconds === null) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Duration, formats and subtitles the Fiche decided: an aid to the check. */
export function expectedFacts(fiche: HandedFiche | null): {
  duration: string | null;
  formats: string | null;
  subtitles: string | null;
} {
  if (!fiche) return { duration: null, formats: null, subtitles: null };
  const min = clock(fiche.durationMinSeconds);
  const max = clock(fiche.durationMaxSeconds);
  return {
    duration: min || max ? t.expected.durationRange(min, max) : null,
    formats: fiche.ratios.length > 0 ? fiche.ratios.join(", ") : null,
    subtitles:
      fiche.subtitles === null
        ? null
        : fiche.subtitles
          ? t.expected.subtitlesOn(
              fiche.subtitleMode
                ? (t.expected.subtitleModes[fiche.subtitleMode] ?? null)
                : null,
              fiche.subtitleRatios,
            )
          : t.expected.noSubtitles,
  };
}
