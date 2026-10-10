// Préproduction › Contrôle avant tournage (ticket, parcours 10). Each check
// is confirmed by a person (who and when, written by the database); the code
// only shows what it knows next to it — the evidence — and never confirms
// in its place: an approved list is not proof that everything is ready.
// Every check is required except the permits, unless the owner says
// otherwise (same rule as production_check_default_required). Client-safe.

import { CHECK_KEYS, type CheckKey, type ReadinessCheck } from "./types";

export const defaultRequired = (key: CheckKey) => key !== "permits";

export type CheckState = "confirmed" | "open" | "not_required";

export type CheckRow = {
  key: CheckKey;
  required: boolean;
  state: CheckState;
  confirmedBy: string | null;
  confirmedAt: string | null;
  note: string | null;
};

/** The seven checks in order, a check never written read as its default. */
export function checkRows(checks: ReadinessCheck[]): CheckRow[] {
  return CHECK_KEYS.map((key) => {
    const c = checks.find((x) => x.key === key);
    const required = c?.required ?? defaultRequired(key);
    const confirmed = Boolean(c?.confirmedAt);
    return {
      key,
      required,
      state: confirmed ? "confirmed" : required ? "open" : "not_required",
      confirmedBy: c?.confirmedBy ?? null,
      confirmedAt: c?.confirmedAt ?? null,
      note: c?.note ?? null,
    };
  });
}

/** « Marquer prête pour tournage » is possible once no required check is
 * open (the database checks it again). */
export const canMarkReady = (rows: CheckRow[]) =>
  rows.every((r) => r.state !== "open");

export const openChecks = (rows: CheckRow[]) =>
  rows.filter((r) => r.state === "open").length;
