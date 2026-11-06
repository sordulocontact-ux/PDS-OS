import { CallNowAction } from "@/components/calls/call-now-action";
import { CallNowBlock } from "@/components/calls/call-now-block";
import { CallProcessing } from "@/components/calls/call-processing";
import { ClosureActions } from "@/components/calls/closure/closure-actions";
import { ClosureHistory } from "@/components/calls/closure/closure-history";
import { formatTime } from "@/lib/calls/format";
import type { CallModule, CallStage, CallTodo } from "@/lib/calls/now";
import type { CallPageData } from "@/lib/calls/page-data";
import type { CallDetail } from "@/lib/calls/queries";
import type { Member } from "@/lib/framing/related";
import { calls } from "@/lib/i18n/fr/calls";
import { formatDay, formatShortDay } from "@/lib/utils/day";

const fr = { calls };

/**
 * « Maintenant » of a call's page (proto `docs/protos/pages.html`), by its
 * state and the reader's role: the owner's first gesture (record, drop the
 * recording, settle the proposals, create the tasks, send the summary,
 * close) with what follows; the processing for everyone; someone else
 * reads who is awaited; a closed call says so, with its report's sharing.
 * Nothing for the owner of a call still to come another day.
 */
export function CallNow({
  call,
  stage,
  todos,
  canEdit,
  hasTranscript,
  fromMeet,
  ownerName,
  where,
  module,
  data,
  members,
}: {
  call: CallDetail;
  stage: CallStage;
  todos: CallTodo[];
  canEdit: boolean;
  hasTranscript: boolean;
  // The transcript was taken from the call's Meet, not recorded.
  fromMeet: boolean;
  ownerName: string | null;
  where: string;
  module: CallModule | null;
  data: CallPageData;
  // Who the report may be shared with (the reader left out).
  members: Member[];
}) {
  const t = fr.calls.page.now;
  const eyebrow = `${call.title} · ${where}`;
  const unreviewed = {
    actions: (data.outcomes?.actions ?? []).filter((a) => !a.task).length,
    proposals: data.pendingProposals,
  };
  const [todo, ...after] = todos;

  if (todo) {
    const texts = {
      record: [
        t.record.title(call.title),
        t.record.why(formatTime(call.occurredAt)),
      ],
      meet: [
        t.meet.title,
        t.meet.why(formatShortDay(call.occurredAt, { bare: true })),
      ],
      upload: [
        t.upload.title,
        t.upload.why(formatShortDay(call.occurredAt, { bare: true })),
      ],
      proposals: [
        t.proposals.title(data.pendingProposals, module?.name ?? ""),
        t.proposals.why,
      ],
      tasks: [t.tasks.title(unreviewed.actions), t.tasks.why],
      summary: [t.summary.title, t.summary.why],
      close: [t.close.title, t.close.why],
    }[todo];
    return (
      <CallNowBlock
        label={t.label}
        badge={{ tone: "info", text: t.mine }}
        eyebrow={eyebrow}
        title={texts[0]}
        why={texts[1]}
        then={
          after.length > 0
            ? {
                label: t.then,
                value: after.map((x) => t.thenOf[x]).join(" · "),
              }
            : null
        }
      >
        <div>
          <CallNowAction
            todo={todo}
            call={call}
            where={where}
            module={module}
            data={data}
            unreviewed={unreviewed}
          />
        </div>
      </CallNowBlock>
    );
  }

  if (stage === "processing")
    return (
      <CallNowBlock
        label={t.label}
        badge={{ tone: "info", text: t.processing }}
        eyebrow={call.title}
        title={t.processingTitle}
        why={call.projectId ? t.processingWhy : t.processingWhyMeeting}
      >
        <CallProcessing
          projectId={call.projectId}
          callId={call.id}
          status={call.status}
          errorCode={call.errorCode}
          hasTranscript={hasTranscript}
          fromMeet={fromMeet}
        />
      </CallNowBlock>
    );

  const latest = data.closures[0];
  if (stage === "closed" && latest)
    return (
      <CallNowBlock
        label={t.label}
        badge={{ tone: "neutral", text: t.closed }}
        eyebrow={call.title}
        title={t.closedTitle(formatDay(latest.closedAt))}
        why={t.closedWhy}
      >
        <ClosureActions
          call={{ id: call.id, title: call.title, occurredAt: call.occurredAt }}
          latest={latest}
          unreviewed={unreviewed}
          canEdit={canEdit}
          members={members}
          guestEmails={call.guests.map((g) => g.email)}
          emailEnabled={data.emailEnabled}
        />
        <ClosureHistory closures={data.closures} shares={data.shares} />
      </CallNowBlock>
    );

  if (canEdit) return null;
  return (
    <CallNowBlock
      label={t.label}
      badge={{ tone: "neutral", text: t.nothing }}
      eyebrow={call.title}
      title={t.waiting(
        ownerName ?? "—",
        stage === "ready" ? t.waitingReport : t.waitingRecord,
      )}
      why={t.waitingWhy}
    />
  );
}
