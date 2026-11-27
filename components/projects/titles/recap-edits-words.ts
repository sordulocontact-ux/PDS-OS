// « Sortie » of a title as a value (Oui / Non / Pas décidé), read by the
// board's cell (on the server too) and changed in the side sheet
// (ReleaseChoice). No "use client": a plain module.

export type ReleaseValue = "yes" | "no" | "undecided";

export const releaseValueOf = (decision: boolean | null): ReleaseValue =>
  decision === true ? "yes" : decision === false ? "no" : "undecided";

export const isReleaseValue = (value: unknown): value is ReleaseValue =>
  value === "yes" || value === "no" || value === "undecided";
