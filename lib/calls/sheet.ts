import { formatTime } from "@/lib/calls/format";
import type { CallDetail } from "@/lib/calls/queries";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

const longDay = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Paris",
});

export type SheetCall = Pick<
  CallDetail,
  | "title"
  | "occurredAt"
  | "endsAt"
  | "agenda"
  | "durationMinutes"
  | "meetingUrl"
>;

/** « Jeudi 8 octobre 2026 · 13:30 – 16:00 · 2 h 30 ». */
export function callWhen(call: Pick<SheetCall, "occurredAt" | "endsAt">) {
  const start = new Date(call.occurredAt);
  const parts = [longDay.format(start)];
  if (call.endsAt) {
    parts.push(
      fr.calls.calendar.timeRange(
        formatTime(call.occurredAt),
        formatTime(call.endsAt),
      ),
      fr.calls.schedule.duration(
        Math.round(
          (new Date(call.endsAt).getTime() - start.getTime()) / 60_000,
        ),
      ),
    );
  } else parts.push(formatTime(call.occurredAt));
  const when = parts.join(" · ");
  return when.charAt(0).toUpperCase() + when.slice(1);
}

/**
 * The call's sheet, to share with people outside the label (retour du
 * 10/10/2026): when and how long, the agenda, the video link. Written by
 * the code from the call itself; nothing about the project or the team,
 * and the prepared questions stay inside PDS OS.
 */
export function callSheetText(call: SheetCall): string {
  const t = fr.calls.details.sheet;
  const lines = [call.title, callWhen(call)];
  // No end time: the agenda's total says how long it should last.
  if (!call.endsAt && call.durationMinutes !== null) {
    lines.push(t.estimated(call.durationMinutes));
  }
  if (call.agenda && call.agenda.length > 0) {
    lines.push(
      "",
      t.agenda,
      ...call.agenda.map((item, index) =>
        t.agendaItem(index + 1, item.topic, item.minutes),
      ),
    );
  }
  lines.push("", call.meetingUrl ? t.link(call.meetingUrl) : t.noLink);
  return lines.join("\n");
}

/** The e-mail's subject: « Call Rentrée · Jeudi 10 octobre 2026 · 14:00 ». */
export function callSheetSubject(call: SheetCall): string {
  return `${call.title} · ${callWhen(call)}`;
}
