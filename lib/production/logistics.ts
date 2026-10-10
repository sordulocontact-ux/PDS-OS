// Production's schedule and envelope against the Fiche Livrable's (ticket,
// « La Fiche Livrable validée est la source créative ; toute divergence est
// signalée et tracée »). Production may keep its own dates (« conserver les
// dates sous réserve de faisabilité »): its value wins, the Fiche's stays
// visible, a difference is flagged. Computed by code. Client-safe.

import type { HandedFiche } from "@/lib/production/fiche";
import type { SheetLogistics } from "@/lib/production/sheet";

export type Sourced<T> = {
  value: T | null;
  // production = written in Production; conception = read from the Fiche.
  source: "production" | "conception" | null;
  // The Fiche's value when Production wrote a different one.
  ficheValue: T | null;
  diverges: boolean;
};

function sourced<T>(own: T | null, fiche: T | null): Sourced<T> {
  if (own !== null)
    return {
      value: own,
      source: "production",
      ficheValue: fiche,
      diverges: fiche !== null && fiche !== own,
    };
  return {
    value: fiche,
    source: fiche !== null ? "conception" : null,
    ficheValue: fiche,
    diverges: false,
  };
}

export type EffectiveLogistics = {
  shootDate: Sourced<string>;
  postStart: Sourced<string>;
  postEnd: Sourced<string>;
  deliveryDate: Sourced<string>;
  budgetEnvelopeCents: Sourced<number>;
};

export function effectiveLogistics(
  own: SheetLogistics | null,
  fiche: HandedFiche | null,
): EffectiveLogistics {
  return {
    shootDate: sourced(own?.shootDate ?? null, fiche?.shootDate ?? null),
    postStart: sourced(own?.postStart ?? null, fiche?.postStart ?? null),
    postEnd: sourced(own?.postEnd ?? null, fiche?.postDeadline ?? null),
    deliveryDate: sourced(
      own?.deliveryDate ?? null,
      fiche?.deliveryDate ?? null,
    ),
    budgetEnvelopeCents: sourced(
      own?.budgetEnvelopeCents ?? null,
      fiche?.budgetCents ?? null,
    ),
  };
}

/** The exports the Fiche expects, one technical check line each: a file
 * per ratio, the subtitles when decided, and the quality control. */
export function expectedExports(
  fiche: HandedFiche | null,
): { label: string; kind: "export" | "subtitles" | "qc" }[] {
  if (!fiche) return [];
  return [
    ...fiche.ratios.map((ratio) => ({
      label: ratio,
      kind: "export" as const,
    })),
    ...(fiche.subtitles
      ? [{ label: "subtitles", kind: "subtitles" as const }]
      : []),
    { label: "qc", kind: "qc" as const },
  ];
}
