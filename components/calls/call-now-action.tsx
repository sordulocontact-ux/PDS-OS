import { AudioUpload } from "@/components/calls/audio-upload";
import { CallRecording } from "@/components/calls/call-recording";
import { CallSummaryButton } from "@/components/calls/call-summary-button";
import { CloseCallButton } from "@/components/calls/closure/close-call-button";
import { JoinCallLink } from "@/components/calls/join-call-link";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import type { Unreviewed } from "@/lib/calls/closure";
import type { CallModule, CallTodo } from "@/lib/calls/now";
import type { CallPageData } from "@/lib/calls/page-data";
import type { CallDetail } from "@/lib/calls/queries";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

/** The gesture of the owner's first to-do, in « Maintenant ». */
export function CallNowAction({
  todo,
  call,
  where,
  module,
  data,
  unreviewed,
}: {
  todo: CallTodo;
  call: CallDetail;
  where: string;
  module: CallModule | null;
  data: CallPageData;
  unreviewed: Unreviewed;
}) {
  const t = fr.calls.page.now;
  switch (todo) {
    case "record":
    case "upload":
      return (
        // Where the modules' « Enregistrer l'échange » lands.
        <div id="call-recording" className="scroll-mt-24">
          {todo === "record" ? (
            <CallRecording
              call={call}
              compact={{
                label: t.record.start,
                beside: call.meetingUrl && (
                  <JoinCallLink url={call.meetingUrl} title={call.title} />
                ),
              }}
            />
          ) : (
            <AudioUpload
              callId={call.id}
              organizationId={call.organizationId}
            />
          )}
        </div>
      );
    case "proposals":
      return (
        module && (
          <ViewLink href={module.href} className={buttonVariants()}>
            <ButtonRoll>{t.proposals.open(module.name)}</ButtonRoll>
          </ViewLink>
        )
      );
    case "tasks":
      return (
        <a href="#call-actions" className={buttonVariants()}>
          <ButtonRoll>{t.tasks.action(unreviewed.actions)}</ButtonRoll>
        </a>
      );
    case "summary":
      return (
        data.summary && (
          <CallSummaryButton
            callId={call.id}
            subject={fr.calls.page.summary.subjectOf(call.title, where)}
            draft={data.summary.draft}
            recipients={data.summary.recipients}
            emailEnabled={data.emailEnabled}
          />
        )
      );
    case "close":
      return (
        <CloseCallButton
          callId={call.id}
          unreviewed={unreviewed}
          closed={false}
        />
      );
  }
}
