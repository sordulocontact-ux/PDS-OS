import type { SummaryVersion } from "@/lib/calls/meeting/types";
import { shortStamp } from "@/lib/calls/prep/dates";
import { meeting } from "@/lib/i18n/fr/meeting";

const fr = { meeting };

/**
 * What a participant reads of a meeting (proto `summaryFor`): the last
 * version of the summary sent to them, who sent it and when.
 */
export function MeetingSummaryFor({
  summary,
}: {
  summary: SummaryVersion | null;
}) {
  if (!summary) return null;
  const t = fr.meeting.summaryFor;
  return (
    <section
      aria-labelledby="meeting-summary-for"
      className="flex flex-col gap-2"
    >
      <h3 id="meeting-summary-for" className="text-body-md font-semibold">
        {t.heading}
      </h3>
      <p className="text-body-md leading-[1.55] whitespace-pre-line">
        {summary.text}
      </p>
      <p className="text-caption text-[color:var(--text-tertiary)]">
        {t.sentBy(
          summary.sentBy ?? "—",
          shortStamp(summary.sentAt),
          summary.version,
        )}
      </p>
    </section>
  );
}
