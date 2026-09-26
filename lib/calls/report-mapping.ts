import type { LocatedCallReport } from "@/lib/ai/call-report";
import type { QuoteLocation } from "@/lib/ai/provenance";
import { NEED_FAMILIES, type NeedFamily } from "@/lib/ai/schemas/call-report";
import type { Database } from "@/lib/supabase/database.types";

/**
 * LocatedCallReport <-> report_items rows. Pure functions, so step 5 (apply a
 * report to the Brief) can reuse the same shape.
 */

type ItemInsert = Database["public"]["Tables"]["report_items"]["Insert"];
export type ReportItemRow = Pick<
  Database["public"]["Tables"]["report_items"]["Row"],
  | "id"
  | "kind"
  | "position"
  | "what"
  | "who"
  | "why"
  | "need_family"
  | "quote"
  | "located"
  | "start_seconds"
  | "end_seconds"
>;

type Draft = Omit<ItemInsert, "organization_id" | "report_id" | "position">;

function location(at: QuoteLocation) {
  return at.status === "timed"
    ? { located: "timed", start_seconds: at.start, end_seconds: at.end }
    : { located: at.status, start_seconds: null, end_seconds: null };
}

export function toReportItemRows(
  report: LocatedCallReport,
  ids: { organizationId: string; reportId: string },
): ItemInsert[] {
  const { brief } = report;
  const drafts: Draft[] = [
    ...report.decided.map((x) => ({
      kind: "decided",
      what: x.what,
      who: x.who,
      why: x.why,
      quote: x.quote,
      ...location(x.at),
    })),
    ...report.open.map((x) => ({
      kind: "open",
      what: x.what,
      why: x.why,
      quote: x.quote,
      ...location(x.at),
    })),
    ...report.nextActions.map((x) => ({
      kind: "next_action",
      what: x.what,
      who: x.who,
      why: x.why,
      quote: x.quote,
      ...location(x.at),
    })),
    ...(["objective", "timing", "frame"] as const).flatMap((kind) => {
      const field = brief[kind];
      return field
        ? [
            {
              kind,
              what: field.value,
              quote: field.quote,
              ...location(field.at),
            },
          ]
        : [];
    }),
    ...brief.needs.map((x) => ({
      kind: "need",
      what: x.label,
      need_family: x.family,
      quote: x.quote,
      ...location(x.at),
    })),
    ...brief.team.map((x) => ({
      kind: "team",
      what: x.name,
      who: x.role,
      quote: x.quote,
      ...location(x.at),
    })),
  ];

  // Position is the order within a kind, as returned by the extraction.
  const counters = new Map<string, number>();
  return drafts.map((draft) => {
    const position = counters.get(draft.kind) ?? 0;
    counters.set(draft.kind, position + 1);
    return {
      ...draft,
      position,
      organization_id: ids.organizationId,
      report_id: ids.reportId,
    };
  });
}

function toLocation(row: ReportItemRow): QuoteLocation {
  if (row.located === "timed" && row.start_seconds !== null) {
    return {
      status: "timed",
      start: row.start_seconds,
      end: row.end_seconds ?? row.start_seconds,
    };
  }
  return { status: row.located === "found" ? "found" : "missing" };
}

function toFamily(value: string | null): NeedFamily {
  return (NEED_FAMILIES as readonly string[]).includes(value ?? "")
    ? (value as NeedFamily)
    : "other";
}

/** Rebuilds the LocatedCallReport rendered by ReportPanel. */
export function fromReportItemRows(
  summary: string,
  rows: readonly ReportItemRow[],
): LocatedCallReport {
  const sorted = [...rows].sort((a, b) => a.position - b.position);
  const of = (kind: string) => sorted.filter((row) => row.kind === kind);
  const base = (row: ReportItemRow) => ({
    quote: row.quote,
    at: toLocation(row),
  });
  const field = (kind: string) => {
    const row = of(kind)[0];
    return row ? { value: row.what, ...base(row) } : null;
  };

  return {
    summary,
    decided: of("decided").map((r) => ({
      what: r.what,
      who: r.who,
      why: r.why,
      ...base(r),
    })),
    open: of("open").map((r) => ({ what: r.what, why: r.why, ...base(r) })),
    nextActions: of("next_action").map((r) => ({
      what: r.what,
      who: r.who,
      why: r.why,
      ...base(r),
    })),
    brief: {
      objective: field("objective"),
      timing: field("timing"),
      frame: field("frame"),
      needs: of("need").map((r) => ({
        label: r.what,
        family: toFamily(r.need_family),
        ...base(r),
      })),
      team: of("team").map((r) => ({ name: r.what, role: r.who, ...base(r) })),
    },
  };
}
