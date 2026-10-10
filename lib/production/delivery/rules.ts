// Production › Livraison (ticket « Workflow Production complet », parcours
// 19 to 21): the technical check of the exports, the three decisions and the
// hand-off to Activations. States computed by code from what people
// recorded, never stored nor guessed. Client-safe.

export const EXPORT_CHECK_KINDS = [
  "export",
  "subtitles",
  "qc",
  "other",
] as const;
export type ExportCheckKind = (typeof EXPORT_CHECK_KINDS)[number];

export const isExportCheckKind = (value: string): value is ExportCheckKind =>
  (EXPORT_CHECK_KINDS as readonly string[]).includes(value);

export type ExportCheckLine = {
  id: string;
  label: string;
  kind: ExportCheckKind;
  url: string | null;
  result: "ok" | "not_ok" | null;
  checkedBy: string | null;
  checkedAt: string | null;
  note: string | null;
};

// stale = checked before the current validated version or final file.
export type ExportLineState = "to_check" | "ok" | "not_ok" | "stale";

const time = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);

/** From when a check counts: the latest of the creative validation and the
 * final file (each resets the delivery's check in the database). */
export function checkSince(
  delivery: { approvedAt: string | null; finalSetAt: string | null } | null,
): string | null {
  if (!delivery) return null;
  const { approvedAt, finalSetAt } = delivery;
  if (!approvedAt) return finalSetAt;
  if (!finalSetAt) return approvedAt;
  return time(approvedAt) >= time(finalSetAt) ? approvedAt : finalSetAt;
}

export function lineStateOf(
  line: Pick<ExportCheckLine, "result" | "checkedAt">,
  since: string | null,
): ExportLineState {
  if (line.result === null) return "to_check";
  if (since && line.checkedAt && time(line.checkedAt) < time(since))
    return "stale";
  return line.result;
}

export type ChecklistSummary = Record<ExportLineState, number> & {
  total: number;
};

export function summarize(
  lines: ExportCheckLine[],
  since: string | null,
): ChecklistSummary {
  const summary: ChecklistSummary = {
    total: lines.length,
    to_check: 0,
    ok: 0,
    not_ok: 0,
    stale: 0,
  };
  for (const line of lines) summary[lineStateOf(line, since)] += 1;
  return summary;
}

export type DecisionState = "done" | "to_do" | "blocked" | "waiting";
export type DecisionReason =
  | { key: "no_version" | "no_checklist" | "not_checked" }
  | { key: "to_check" | "not_ok" | "stale"; count: number };
export type Decision = { state: DecisionState; reasons: DecisionReason[] };

/**
 * Validation créative, contrôle technique, livraison: three distinct
 * decisions, in this order (ticket § 20). « Livré » only once the validated
 * version, every expected file conforming and the confirmed check stand.
 */
export function decisionsOf(input: {
  approvedAt: string | null;
  checkedAt: string | null;
  deliveredAt: string | null;
  summary: ChecklistSummary;
}): { creative: Decision; technical: Decision; delivery: Decision } {
  const { approvedAt, checkedAt, deliveredAt, summary } = input;
  const creative: Decision = approvedAt
    ? { state: "done", reasons: [] }
    : { state: "to_do", reasons: [{ key: "no_version" }] };

  const lineReasons: DecisionReason[] = [];
  if (summary.total === 0) lineReasons.push({ key: "no_checklist" });
  if (summary.not_ok > 0)
    lineReasons.push({ key: "not_ok", count: summary.not_ok });
  if (summary.to_check > 0)
    lineReasons.push({ key: "to_check", count: summary.to_check });
  if (summary.stale > 0)
    lineReasons.push({ key: "stale", count: summary.stale });

  const technical: Decision = checkedAt
    ? { state: "done", reasons: [] }
    : !approvedAt
      ? { state: "waiting", reasons: [{ key: "no_version" }, ...lineReasons] }
      : {
          state: summary.not_ok > 0 ? "blocked" : "to_do",
          reasons: lineReasons,
        };

  const delivery: Decision = deliveredAt
    ? { state: "done", reasons: [] }
    : checkedAt
      ? { state: "to_do", reasons: [] }
      : {
          state: summary.not_ok > 0 ? "blocked" : "waiting",
          reasons: [
            ...(approvedAt ? [] : [{ key: "no_version" as const }]),
            { key: "not_checked" as const },
            ...lineReasons,
          ],
        };

  return { creative, technical, delivery };
}

export type HandoffStaleness = "reopened" | "version" | "file" | "redelivered";

/** Why a transmission no longer matches the delivery, or null when it does
 * (ticket § 21: « une activation peut pointer vers une version antérieure »). */
export function handoffStaleness(
  handoff: {
    versionId: string | null;
    finalUrl: string | null;
    deliveredAt: string;
  },
  delivery: {
    versionId: string | null;
    finalUrl: string | null;
    deliveredAt: string | null;
  } | null,
): HandoffStaleness | null {
  if (!delivery?.deliveredAt) return "reopened";
  if (handoff.versionId !== delivery.versionId) return "version";
  if (handoff.finalUrl !== delivery.finalUrl) return "file";
  if (time(handoff.deliveredAt) !== time(delivery.deliveredAt))
    return "redelivered";
  return null;
}

/** Horizontal, vertical or square, read from a « 16:9 »-like ratio. */
export function orientationOf(
  ratio: string,
): "horizontal" | "vertical" | "square" | null {
  const match = /^\s*(\d+(?:[.,]\d+)?)\s*[:x/]\s*(\d+(?:[.,]\d+)?)\s*$/.exec(
    ratio,
  );
  if (!match) return null;
  const width = Number(match[1].replace(",", "."));
  const height = Number(match[2].replace(",", "."));
  if (!width || !height) return null;
  return width > height ? "horizontal" : width < height ? "vertical" : "square";
}

/** The formats a transmission proposes: the Fiche's ratios, else the
 * checklist's export lines. */
export function proposedFormats(
  ficheRatios: string[],
  lines: ExportCheckLine[],
): string[] {
  const source =
    ficheRatios.length > 0
      ? ficheRatios
      : lines.filter((l) => l.kind === "export").map((l) => l.label);
  return [...new Set(source.map((f) => f.trim()).filter(Boolean))].slice(0, 20);
}
