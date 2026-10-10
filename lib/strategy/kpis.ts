// KPIs of the Stratégie (ticket § 7): a quantitative signal (a figure to
// reach) or a qualitative one (a sign to look for, no figure). A real data
// source may measure a figure after the release; the value is then read by
// code, never written by PO nor made up (CLAUDE.md, rule 6). Client-safe.

export const KPI_KINDS = ["quantitative", "qualitative"] as const;
export type KpiKind = (typeof KPI_KINDS)[number];

export const KPI_SOURCES = ["manual", "deezer_fans"] as const;
export type KpiSource = (typeof KPI_SOURCES)[number];

export function isKpiKind(value: unknown): value is KpiKind {
  return (
    typeof value === "string" &&
    (KPI_KINDS as readonly string[]).includes(value)
  );
}

/**
 * What the code knows of a measured KPI: not yet (before the release),
 * unavailable (no source reachable, no Deezer profile), or the value read
 * from the source on a given day.
 */
export type KpiActual =
  | { status: "pending" }
  | { status: "unavailable" }
  | { status: "measured"; value: number; on: string };
