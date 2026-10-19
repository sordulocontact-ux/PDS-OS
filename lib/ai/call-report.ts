import "server-only";

import { CALL_REPORT_INSTRUCTIONS } from "@/lib/ai/instructions/call-report";
import { extract, type Extraction } from "@/lib/ai/llm";
import { locateQuote, type QuoteLocation } from "@/lib/ai/provenance";
import {
  callReportSchema,
  type CallReport,
} from "@/lib/ai/schemas/call-report";
import type { Transcript } from "@/lib/ai/schemas/transcript";

type Located<T> = T & { at: QuoteLocation };
type Brief = CallReport["brief"];
type Strategy = CallReport["strategy"];
type Field = NonNullable<Brief["objective"]>;

export type LocatedCallReport = {
  summary: string;
  decided: Located<CallReport["decided"][number]>[];
  open: Located<CallReport["open"][number]>[];
  nextActions: Located<CallReport["nextActions"][number]>[];
  brief: {
    objective: Located<Field> | null;
    timing: Located<Field> | null;
    needs: Located<Brief["needs"][number]>[];
    frame: Located<Brief["frame"][number]>[];
    team: Located<Brief["team"][number]>[];
  };
  strategy: {
    positioning: Located<Field> | null;
    audiences: Located<Field> | null;
    narrative: Located<Field> | null;
    levers: Located<Strategy["levers"][number]>[];
    deliverables: Located<Strategy["deliverables"][number]>[];
    milestones: Located<Strategy["milestones"][number]>[];
    kpis: Located<Strategy["kpis"][number]>[];
  };
};

/** The agenda as given with the transcript: one key per point (p1, p2…). */
export const agendaKey = (index: number) => `p${index + 1}`;

/**
 * Extracts the call report, then attaches the provenance of every item.
 * With the call's agenda, each decision, open question and action names the
 * point it belongs to (a key, checked by code afterwards).
 */
export async function extractCallReport(
  transcript: Transcript,
  agenda: string[] = [],
): Promise<Extraction<LocatedCallReport>> {
  const input = agenda.length
    ? `Ordre du jour :\n${agenda.map((topic, i) => `${agendaKey(i)} : ${topic}`).join("\n")}\n\nTranscription :\n${transcript.text}`
    : transcript.text;
  const extraction = await extract(
    callReportSchema,
    input,
    CALL_REPORT_INSTRUCTIONS,
  );

  const locate = <T extends { quote: string }>(item: T): Located<T> => ({
    ...item,
    at: locateQuote(item.quote, transcript),
  });
  const locateField = (item: Field | null) => (item ? locate(item) : null);

  const report = extraction.output;
  return {
    ...extraction,
    output: {
      summary: report.summary,
      decided: report.decided.map(locate),
      open: report.open.map(locate),
      nextActions: report.nextActions.map(locate),
      brief: {
        objective: locateField(report.brief.objective),
        timing: locateField(report.brief.timing),
        needs: report.brief.needs.map(locate),
        frame: report.brief.frame.map(locate),
        team: report.brief.team.map(locate),
      },
      strategy: {
        positioning: locateField(report.strategy.positioning),
        audiences: locateField(report.strategy.audiences),
        narrative: locateField(report.strategy.narrative),
        levers: report.strategy.levers.map(locate),
        deliverables: report.strategy.deliverables.map(locate),
        milestones: report.strategy.milestones.map(locate),
        kpis: report.strategy.kpis.map(locate),
      },
    },
  };
}
