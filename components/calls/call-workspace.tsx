import Link from "next/link";
import { IconChevronLeft } from "nucleo-sharp-essential";

import { CallAgenda } from "@/components/calls/call-agenda";
import { CallStatusBadge } from "@/components/calls/call-badges";
import { CallLinkButton } from "@/components/calls/call-link-button";
import { CallAudio, CallRecording } from "@/components/calls/call-recording";
import { CallResults } from "@/components/calls/call-results";
import { JoinCallLink } from "@/components/calls/join-call-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime, isUpcoming } from "@/lib/calls/format";
import { fr } from "@/lib/i18n/fr";
import type {
  CallDetail,
  StoredReport,
  StoredTranscript,
} from "@/lib/calls/queries";

type StepTexts = { title: string; description: string };

/**
 * One call, one step at a time: record it, let the processing run by itself,
 * then its report, decisions and actions. Shared by a project's call and an
 * internal meeting; the page gives what differs (way back, subtitle, the
 * step texts, what follows the report).
 */
export function CallWorkspace({
  call,
  transcript,
  report,
  audioUrl,
  canEdit,
  back,
  subtitle,
  steps,
  doneAction,
  outcomes,
}: {
  call: CallDetail;
  transcript: StoredTranscript | null;
  report: StoredReport | null;
  audioUrl: string | null;
  // Whoever works on the call: the project's owner, the meeting's creator.
  canEdit: boolean;
  back: { href: string; label: string };
  subtitle?: React.ReactNode;
  steps: { record: StepTexts; processing: StepTexts; done: StepTexts };
  // Under the recording once the report is ready (the project's framing).
  doneAction?: React.ReactNode;
  // Decisions and actions of the report.
  outcomes?: React.ReactNode;
}) {
  const step = !call.audioPath ? "record" : report ? "done" : "processing";
  const upcoming = isUpcoming(call, new Date());
  // The link is useful until the call is recorded.
  const joinable = call.meetingUrl && !call.audioPath;

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
          <div className="grid gap-1">
            <h2 className="text-lg font-semibold break-words">{call.title}</h2>
            <time
              dateTime={call.occurredAt}
              className="text-sm text-muted-foreground"
            >
              {formatDateTime(call.occurredAt)}
            </time>
            {subtitle}
          </div>
          <CallStatusBadge status={call.status} upcoming={upcoming} />
        </div>
        {(joinable || (canEdit && !call.audioPath)) && (
          <div className="flex flex-wrap items-center gap-2">
            {joinable && call.meetingUrl && (
              <JoinCallLink url={call.meetingUrl} title={call.title} />
            )}
            {canEdit && !call.audioPath && (
              <CallLinkButton callId={call.id} meetingUrl={call.meetingUrl} />
            )}
          </div>
        )}
      </header>

      {call.framing && (
        <div className="grid gap-2 rounded-lg border border-border p-4 text-sm">
          <h3 className="font-medium">{fr.framingIntel.call.detailsTitle}</h3>
          <p>
            <span className="text-muted-foreground">
              {fr.framingIntel.call.detailsPurpose} :{" "}
            </span>
            {call.framing.purpose}
          </p>
          {call.framing.participants.length > 0 && (
            <p>
              <span className="text-muted-foreground">
                {fr.framingIntel.call.participants} :{" "}
              </span>
              {call.framing.participants.join(", ")}
            </p>
          )}
          {call.framing.documents.length > 0 && (
            <p>
              <span className="text-muted-foreground">
                {fr.framingIntel.call.documents} :{" "}
              </span>
              {call.framing.documents.map((d) => d.name).join(", ")}
            </p>
          )}
        </div>
      )}
      {step === "record" && call.agenda && (
        <CallAgenda
          callId={call.id}
          agenda={call.agenda}
          durationMinutes={call.durationMinutes}
          canEdit={canEdit}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>{steps[step].title}</CardTitle>
          <CardDescription>{steps[step].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {step === "done" ? (
            <div className="grid gap-6">
              {doneAction}
              <CallAudio call={call} audioUrl={audioUrl} />
            </div>
          ) : (
            <CallRecording
              call={call}
              audioUrl={audioUrl}
              hasTranscript={transcript !== null}
            />
          )}
        </CardContent>
      </Card>

      {step === "done" && outcomes}
      {step === "done" && (
        <CallResults transcript={transcript} report={report} />
      )}
    </div>
  );
}
