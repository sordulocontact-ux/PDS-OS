import Link from "next/link";
import { IconChevronLeft } from "nucleo-sharp-essential";

import { CallAgenda } from "@/components/calls/call-agenda";
import { CallStatusBadge } from "@/components/calls/call-badges";
import { CallAudio, CallRecording } from "@/components/calls/call-recording";
import { CallResults } from "@/components/calls/call-results";
import { CallDetails } from "@/components/calls/call-details";
import { PreparedCallDetails } from "@/components/calls/prepared-call-details";
import { PageSection } from "@/components/shell/page-section";
import { ToneCallout } from "@/components/ui/tone-callout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isUpcoming } from "@/lib/calls/format";
import type {
  CallDetail,
  StoredReport,
  StoredTranscript,
} from "@/lib/calls/queries";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

type StepTexts = { title: string; description: string };

// The recording opens by itself from this long before the call.
const RECORD_OPEN_MS = 15 * 60_000;

/**
 * One call's page: first its details, as Teams shows a meeting (when, what it
 * belongs to, the video link written out, who takes part), then its agenda,
 * then one step at a time: record it (folded until the call's time comes),
 * the processing that runs by itself, its report, decisions and actions.
 * Shared by a project's call and an internal meeting; the page gives what
 * differs (way back, what it belongs to, organizer, step texts, what follows
 * the report).
 */
export function CallWorkspace({
  call,
  transcript,
  report,
  audioUrls,
  canEdit,
  back,
  where,
  organizer,
  steps,
  doneAction,
  outcomes,
  meetFailed = false,
}: {
  call: CallDetail;
  transcript: StoredTranscript | null;
  report: StoredReport | null;
  // One per take when the call was recorded in parts.
  audioUrls: Array<string | null>;
  // Whoever works on the call: the project's owner, the meeting's creator.
  canEdit: boolean;
  back: { href: string; label: string };
  // The project (a link) or « Réunion interne ».
  where: React.ReactNode;
  organizer: string | null;
  steps: { record: StepTexts; processing: StepTexts; done: StepTexts };
  // Under the recording once the report is ready (the project's framing).
  doneAction?: React.ReactNode;
  // Decisions and actions of the report.
  outcomes?: React.ReactNode;
  // Google gave no Meet link at creation (?meet=failed): said until a link
  // is added.
  meetFailed?: boolean;
}) {
  const step = !call.audioPath ? "record" : report ? "done" : "processing";
  const now = new Date();
  const upcoming = isUpcoming(call, now);
  // A strategy call held on site or by phone takes no video link.
  const linkable =
    canEdit &&
    !call.audioPath &&
    (!call.prepared?.format || call.prepared.format === "video");
  const recordOpen =
    new Date(call.occurredAt).getTime() - now.getTime() < RECORD_OPEN_MS;

  return (
    <div className="grid w-full max-w-3xl gap-6">
      <header className="grid gap-3">
        <Link
          href={back.href}
          className="-ml-1 inline-flex min-h-10 w-fit items-center gap-1 rounded-md px-1 text-sm text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <IconChevronLeft aria-hidden className="size-4" />
          {back.label}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold break-words">{call.title}</h2>
          <CallStatusBadge status={call.status} upcoming={upcoming} />
        </div>
        {meetFailed && !call.meetingUrl && (
          <ToneCallout tone="warning">
            {fr.calls.schedule.meetFailed}
          </ToneCallout>
        )}
      </header>

      <CallDetails
        call={call}
        where={where}
        organizer={organizer}
        canEditLink={linkable}
      />
      {call.prepared && <PreparedCallDetails prepared={call.prepared} />}
      {step === "record" && call.agenda && (
        <CallAgenda
          callId={call.id}
          agenda={call.agenda}
          durationMinutes={call.durationMinutes}
          canEdit={canEdit}
          edited={call.agendaEdited}
        />
      )}

      {step === "record" ? (
        canEdit && (
          <PageSection
            id="call-recording"
            title={fr.calls.details.recordTitle}
            description={
              recordOpen
                ? steps.record.description
                : fr.calls.details.recordLater
            }
            card
            collapsible
            // A recording interrupted earlier is never hidden.
            defaultOpen={
              recordOpen || call.recording.takes.some((t) => t.pieces > 0)
            }
          >
            <CallRecording
              call={call}
              audioUrls={audioUrls}
              hasTranscript={transcript !== null}
            />
          </PageSection>
        )
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{steps[step].title}</CardTitle>
            <CardDescription>{steps[step].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {step === "done" ? (
              <div className="grid gap-6">
                {doneAction}
                <CallAudio call={call} audioUrls={audioUrls} />
              </div>
            ) : (
              <CallRecording
                call={call}
                audioUrls={audioUrls}
                hasTranscript={transcript !== null}
              />
            )}
          </CardContent>
        </Card>
      )}

      {step === "done" && outcomes}
      {step === "done" && (
        <CallResults transcript={transcript} report={report} />
      )}
    </div>
  );
}
