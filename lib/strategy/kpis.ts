// KPIs of the Stratégie (ticket § 7): a quantitative signal (a figure to
// reach) or a qualitative one (a sign to look for, no figure). A real data
// source may measure a figure after the release; the value is then read by
// code, never written by PO nor made up (CLAUDE.md, rule 6). Client-safe.

export const KPI_KINDS = ["quantitative", "qualitative"] as const;
export type KpiKind = (typeof KPI_KINDS)[number];

export const KPI_SOURCES = ["manual", "deezer_fans"] as const;
export type KpiSource = (typeof KPI_SOURCES)[number];

// What a figure measures (MKT-S1-03): streams and fans are never the same
// metric. Same list in SQL (strategy_objectives_metric_check).
export const KPI_METRICS = [
  "streams",
  "fans",
  "views",
  "playlists",
  "other",
] as const;
export type KpiMetric = (typeof KPI_METRICS)[number];

export function isKpiMetric(value: unknown): value is KpiMetric {
  return (
    typeof value === "string" &&
    (KPI_METRICS as readonly string[]).includes(value)
  );
}

/** The only source plugged in measures the artist's Deezer fans. */
export const sourceFits = (metric: KpiMetric | null, source: KpiSource) =>
  source === "manual" || metric === "fans";

// Metrics a platform could measure, but no source is connected yet.
const CONNECTABLE: ReadonlySet<KpiMetric> = new Set([
  "streams",
  "views",
  "playlists",
]);

/**
 * How a KPI is followed: measured by Deezer, noted by hand, or noted by
 * hand while its source is still to connect — said on the KPI and in the
 * Brief, so a target is never read against another metric.
 */
export function kpiTracking(
  metric: KpiMetric | null,
  source: string,
): "deezer" | "manual" | "to_connect" {
  if (source === "deezer_fans" && metric === "fans") return "deezer";
  return metric && CONNECTABLE.has(metric) ? "to_connect" : "manual";
}

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
