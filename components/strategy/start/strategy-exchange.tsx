import { CallFacts } from "@/components/calls/call-facts";
import { MeetingFacts } from "@/components/calls/meeting/meeting-facts";
import { MeetingSummaryBlock } from "@/components/calls/meeting/meeting-summary-block";
import { MeetingSummaryFor } from "@/components/calls/meeting/meeting-summary-for";
import { PlannedCallFacts } from "@/components/calls/prep/planned-call-facts";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { summaryDraft } from "@/lib/calls/meeting/draft";
import { loadCallSummaries, loadMeeting } from "@/lib/calls/meeting/queries";
import { callWhen } from "@/lib/calls/prep/dates";
import { loadPlannedCall } from "@/lib/calls/prep/planned";
import { strategyJourney } from "@/lib/i18n/fr/strategy-journey";
import type { StrategyModel } from "@/lib/strategy/dimension-model";
import { strategyMeetingLines } from "@/lib/strategy/meeting-lines";
import type { StrategyCallInfo } from "@/lib/strategy/step-sources";

const fr = { strategyJourney };

/**
 * The strategy exchange in « Démarrer la stratégie », once prepared (proto
 * prepGate « strat », then summaryBlock): the planned call (recorded in PDS
 * OS from its page), then — once recorded, transcribed and filed by PO —
 * the summary to the participants above « Départ : Échange stratégique du
 * … · Lire le compte rendu », when everything said is settled in « Les 8
 * dimensions ».
 */
export async function StrategyExchange({
  projectId,
  call,
  model,
  canEdit,
  ownerName,
  validatorNames,
  mePersonId,
}: {
  projectId: string;
  call: StrategyCallInfo;
  model: StrategyModel;
  canEdit: boolean;
  ownerName: string | null;
  validatorNames: string;
  mePersonId: string | null;
}) {
  const t = fr.strategyJourney.start;
  const departure = (
    <CallFacts
      facts={[
        {
          label: t.departure,
          value: t.departureCall(callWhen(call.occurredAt)),
        },
      ]}
    />
  );

  if (!call.reported) {
    const planned = await loadPlannedCall(call.callId);
    if (!planned) return departure;
    if (!call.recorded)
      return (
        <PlannedCallFacts
          call={planned}
          noun="exchange"
          waiting={
            canEdit
              ? null
              : {
                  name: ownerName ?? "—",
                  what: fr.strategyJourney.todo.hold.toLowerCase(),
                }
          }
        />
      );
    return (
      <div className="flex flex-col gap-3">
        {departure}
        <p className="text-body-md text-[color:var(--text-secondary)]">
          {t.processing}
        </p>
        <ViewLink
          href={routes.projectCall(projectId, call.callId)}
          className="self-start text-body-md font-semibold underline underline-offset-2"
        >
          {t.openCall}
        </ViewLink>
      </div>
    );
  }

  const [base, summaries] = await Promise.all([
    loadMeeting(call.callId, { name: t.meetingName, noun: "exchange" }),
    loadCallSummaries(call.callId),
  ]);
  if (!base) return departure;
  const lines = strategyMeetingLines(
    model,
    routes.projectCall(projectId, call.callId),
  );
  const meeting = {
    ...base,
    lines: [
      ...lines,
      // What follows, said by code: the direction and the creative
      // directors asked (proto: « … auprès de Claire Morel »).
      {
        id: "next-brief",
        topic: null,
        kind: "action" as const,
        who: null,
        due: null,
        text: t.summaryNext(validatorNames),
        became: null,
        quote: null,
        state: { kind: "confirmed" as const, by: ownerName ?? "—" },
      },
    ],
  };
  const settled = lines.every((l) => l.state.kind !== "pending");
  const recipients = meeting.participants.filter(
    (p) => p.key !== `m:${mePersonId}`,
  );
  return (
    <div className="flex flex-col gap-5">
      {canEdit
        ? (settled || summaries.length > 0) && (
            <MeetingSummaryBlock
              callId={call.callId}
              draft={summaryDraft(meeting, ownerName)}
              recipients={recipients}
              versions={summaries}
              canSend
              ownerName={ownerName}
            />
          )
        : summaries.length > 0 && (
            <MeetingSummaryFor
              summary={summaries[0] ?? null}
              callId={call.callId}
            />
          )}
      <MeetingFacts meeting={meeting} />
    </div>
  );
}
