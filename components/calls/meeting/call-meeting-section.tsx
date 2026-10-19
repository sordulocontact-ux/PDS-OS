import { PageSection } from "@/components/shell/page-section";
import { loadCallClosures } from "@/lib/calls/closure-queries";
import { summaryDraft } from "@/lib/calls/meeting/draft";
import { loadCallSummaries, loadMeeting } from "@/lib/calls/meeting/queries";
import type { MeetingLine } from "@/lib/calls/meeting/types";
import { fr } from "@/lib/i18n/fr";

import { MeetingFacts } from "./meeting-facts";
import { MeetingSummaryBlock } from "./meeting-summary-block";
import { MeetingSummaryFor } from "./meeting-summary-for";

/**
 * The meeting held, on a call's page: its facts and its report point by
 * point (« Lire le compte rendu »), then the summary to its participants.
 * A call's page has no step that settles its lines: what the closed report
 * kept (decisions, actions) reads as confirmed by whoever closed it, the
 * summary is offered once it is closed. A module's step gives its own
 * states (its proposals confirmed, corrected, discarded).
 */
export async function CallMeetingSection({
  callId,
  title,
  canEdit,
  mePersonId,
  ownerName,
  format,
}: {
  callId: string;
  // What the module's link table says (Visio / Sur place), when it says it.
  format: "video" | "in_person" | null;
  title: string;
  canEdit: boolean;
  mePersonId: string | null;
  ownerName: string | null;
}) {
  const [{ closures }, summaries, base] = await Promise.all([
    loadCallClosures(callId),
    loadCallSummaries(callId),
    loadMeeting(callId, { name: title, noun: "call", format }),
  ]);
  if (!base) return null;
  const closed = closures[0] ?? null;
  const kept = new Set(
    closed
      ? [...closed.content.decisions, ...closed.content.actions].map(
          (x) => x.what,
        )
      : [],
  );
  const meeting = {
    ...base,
    lines: base.lines.map((line): MeetingLine =>
      closed && line.kind !== "arbitrate" && kept.has(line.text)
        ? { ...line, state: { kind: "confirmed", by: closed.closedByName } }
        : line,
    ),
  };
  const recipients = meeting.participants.filter(
    (p) => p.key !== `m:${mePersonId}`,
  );
  const t = fr.meeting;
  return (
    <PageSection id="call-meeting" title={t.section} card>
      <div className="flex flex-col gap-6">
        <MeetingFacts meeting={meeting} />
        {canEdit ? (
          (closed || summaries.length > 0) && (
            <MeetingSummaryBlock
              callId={callId}
              draft={summaryDraft(meeting, ownerName)}
              recipients={recipients}
              versions={summaries}
              canSend={canEdit}
              ownerName={ownerName}
            />
          )
        ) : (
          <MeetingSummaryFor summary={summaries[0] ?? null} />
        )}
      </div>
    </PageSection>
  );
}
