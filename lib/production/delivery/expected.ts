// What the Fiche Livrable expects of the final files, worded for the
// checklist: one line per expected file (lib/production/logistics.ts) and the
// facts that guide the check. Read from the Fiche, never guessed. Client-safe.

import { fr } from "@/lib/i18n/fr";
import {
  orientationOf,
  type ExportCheckKind,
} from "@/lib/production/delivery/rules";
import type { HandedFiche } from "@/lib/production/fiche";
import { expectedExports } from "@/lib/production/logistics";

const t = fr.productionDelivery.checklist;

/** The expected lines, labelled in French (« Export horizontal 16:9 »…). */
export function expectedLines(
  fiche: HandedFiche | null,
): { label: string; kind: ExportCheckKind }[] {
  return expectedExports(fiche).map((line) => {
    if (line.kind === "subtitles")
      return {
        label: t.labels.subtitles(fiche?.subtitleMode ?? null),
        kind: line.kind,
      };
    if (line.kind === "qc") return { label: t.labels.qc, kind: line.kind };
    const orientation = orientationOf(line.label);
    return {
      label: t.labels.export(
        orientation ? t.labels.orientations[orientation] : null,
        line.label,
      ),
      kind: line.kind,
    };
  });
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
