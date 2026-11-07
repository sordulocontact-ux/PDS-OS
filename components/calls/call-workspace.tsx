import { CallAgenda } from "@/components/calls/call-agenda";
import { CallNow } from "@/components/calls/call-now";
import { CallOutcomes } from "@/components/calls/call-outcomes";
import { CallRecording } from "@/components/calls/call-recording";
import {
  CallReportCard,
  CallTranscriptCard,
} from "@/components/calls/call-report-card";
import { CallSide } from "@/components/calls/call-side";
import { PageSection } from "@/components/shell/page-section";
import { ToneCallout } from "@/components/ui/tone-callout";
import { isUpcoming } from "@/lib/calls/format";
import {
  callStage,
  callTodos,
  recordsToday,
  type CallModule,
} from "@/lib/calls/now";
import type { CallPageData } from "@/lib/calls/page-data";
import type { CallDetail, StoredTranscript } from "@/lib/calls/queries";
import type { Member } from "@/lib/framing/related";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

/**
 * One call's page (proto `docs/protos/pages.html`, « Calls »), shared by a
 * project's call and an internal meeting, opened from Calls or from its
 * project (CallPage): its head (`CallHeader`), « Maintenant » by state and
 * role, then « Décisions et actions », the report, the agenda and the folded
 * transcript; on the side, the participants, the recording and the video
 * link. CallPage gives what differs (the head of its door, where it
 * belongs, the module its proposals are settled in, where its tasks may go).
 */
export function CallWorkspace({
  call,
  header,
  transcript,
  audioUrls,
  canEdit,
  where,
  organizer,
  module = null,
  data,
  members,
  mePersonId,
  taskProjects,
  deliverableId = null,
  meetFailed = false,
}: {
  call: CallDetail;
  // CallHeader, as the door it was opened from draws it.
  header: React.ReactNode;
  transcript: StoredTranscript | null;
  // One per take when the call was recorded in parts.
  audioUrls: Array<string | null>;
  // Whoever works on the call: the project's owner, the meeting's creator.
  canEdit: boolean;
  // The project's title or « Réunion interne » (the summary's subject).
  where: string;
  organizer: string | null;
  module?: CallModule | null;
  data: CallPageData;
  // Who a task may be given to, and the report shared with.
  members: Member[];
  mePersonId: string | null;
  // Where a task may go: the call's project when the reader owns it, else
  // (meeting) the launched projects they own. Empty: read only.
  taskProjects: { id: string; title: string }[];
  // The deliverable a creative exchange is about: its tasks point to it.
  deliverableId?: string | null;
  // Google gave no Meet link at creation (?meet=failed): said until a link
  // is added.
  meetFailed?: boolean;
}) {
  const now = new Date();
  const closed = data.closures.length > 0;
  const upcoming = isUpcoming(call, now);
  const stage = callStage(
    { ...call, hasTranscript: transcript !== null },
    closed,
    now,
  );
  const actionsLeft = (data.outcomes?.actions ?? []).filter((a) => !a.task);
  const todos = callTodos({
    stage,
    owner: canEdit,
    today: recordsToday(call, now),
    interrupted: call.recording.takes.some((take) => take.pieces > 0),
    ownMeet: call.ownMeet,
    pendingProposals: module ? data.pendingProposals : 0,
    tasksLeft: taskProjects.length > 0 ? actionsLeft.length : 0,
    summarySent: data.summarySent,
    recipients: data.summary?.recipients.length ?? 0,
  });
  // A call held on site or by phone takes no video link.
  const linkable =
    canEdit &&
    !call.audioPath &&
    !transcript &&
    (!call.prepared?.format || call.prepared.format === "video");

  return (
    <div className="flex w-full flex-col gap-6">
      {header}
      {meetFailed && !call.meetingUrl && (
        <ToneCallout tone="warning">{fr.calls.schedule.meetFailed}</ToneCallout>
      )}
      <CallNow
        call={call}
        stage={stage}
        todos={todos}
        canEdit={canEdit}
        hasTranscript={transcript !== null}
        fromMeet={transcript?.provider === "google_meet"}
        ownerName={organizer}
        where={where}
        module={module}
        data={data}
        members={members.filter((m) => m.personId !== mePersonId)}
      />
      {canEdit && stage === "planned" && todos.length === 0 && (
        // Another day: nothing to do now, but a module's « Enregistrer
        // l'échange » lands here (#call-recording), folded.
        <PageSection
          id="call-recording"
          title={fr.calls.details.recordTitle}
          description={fr.calls.details.recordLater}
          card
          collapsible
          defaultOpen={false}
        >
          <CallRecording call={call} />
        </PageSection>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {data.outcomes && (
            <CallOutcomes
              outcomes={data.outcomes}
              members={members}
              projectId={call.projectId}
              projects={taskProjects}
              deliverableId={deliverableId}
            />
          )}
          {data.meeting && <CallReportCard meeting={data.meeting} />}
          {call.agenda && (
            <CallAgenda
              callId={call.id}
              agenda={call.agenda}
              durationMinutes={call.durationMinutes}
              canEdit={canEdit && !call.audioPath && !transcript}
              edited={call.agendaEdited}
            />
          )}
          {transcript && <CallTranscriptCard transcript={transcript} />}
        </div>
        <CallSide
          call={call}
          audioUrls={audioUrls}
          upcoming={upcoming}
          canEditLink={linkable}
          canEditPeople={canEdit}
        />
      </div>
    </div>
  );
}
