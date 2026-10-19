// The summary sent to the participants, drafted by code (never by the
// model, rule 6): what was confirmed in the step, without quotes, without
// what was discarded or is still to confirm, without the internal budget.
// Client-safe.

import { shortDay } from "@/lib/calls/prep/dates";
import type { MeetingData, MeetingLine } from "@/lib/calls/meeting/types";
import { fr } from "@/lib/i18n/fr";

const settledText = (line: MeetingLine) => line.became ?? line.text;
const kept = (line: MeetingLine) =>
  (line.state.kind === "confirmed" || line.state.kind === "corrected") &&
  !line.internal;

/** « Bonjour à tous, … Décisions : — … / À confirmer : … / Prochaines étapes : … ». */
export function summaryDraft(
  meeting: MeetingData,
  signature: string | null,
): string {
  const t = fr.meeting.summary.draft;
  const lines = meeting.lines.filter(kept);
  const of = (kind: MeetingLine["kind"]) =>
    lines.filter((l) => l.kind === kind);
  const topicLine = (l: MeetingLine) =>
    t.line(l.topic ? t.topicLine(l.topic, settledText(l)) : settledText(l));
  const parts = [
    // Lines without a nature (a module's own) read as decisions.
    [t.decisions, [...of("decision"), ...of(null)].map(topicLine)],
    [t.toConfirm, of("hypothesis").map(topicLine)],
    [
      t.next,
      of("action").map((l) =>
        t.line(t.actionLine(settledText(l), l.who, l.due)),
      ),
    ],
  ] as const;
  const body = parts
    .filter(([, list]) => list.length > 0)
    .map(([title, list]) => `${title}\n${list.join("\n")}`)
    .join("\n\n");
  return [
    t.hello,
    t.thanks(meeting.noun, shortDay(meeting.occurredAt)),
    body,
    signature ?? "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Everything said in the meeting was settled: the summary can go. */
export const meetingSettled = (meeting: MeetingData) =>
  meeting.lines.length > 0 &&
  meeting.lines.every((l) => l.state.kind !== "pending");
