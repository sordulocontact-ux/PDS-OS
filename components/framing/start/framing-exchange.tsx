import { CallFacts } from "@/components/calls/call-facts";
import { MeetingFacts } from "@/components/calls/meeting/meeting-facts";
import { MeetingSummaryBlock } from "@/components/calls/meeting/meeting-summary-block";
import { MeetingSummaryFor } from "@/components/calls/meeting/meeting-summary-for";
import { ExchangeInPlace } from "@/components/framing/start/exchange-in-place";
import { summaryDraft } from "@/lib/calls/meeting/draft";
import { loadCallSummaries, loadMeeting } from "@/lib/calls/meeting/queries";
import type { MeetingLine } from "@/lib/calls/meeting/types";
import { callWhen } from "@/lib/calls/prep/dates";
import { loadCallInPlace, loadPlannedCall } from "@/lib/calls/prep/planned";
import type { FramingAssessment } from "@/lib/framing/assess";
import type { FramingCallInfo } from "@/lib/framing/journey-context";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";

const fr = { framingIntel, framingJourney };

/**
 * What PO filed from the framing exchange, as meeting lines (one per
 * information said, under its dimension): the state is the Cadrage's —
 * confirmed or corrected in « Les 6 dimensions », still to confirm, or set
 * aside. The budget stays internal (never in the participants' summary).
 */
function framingLines(
  assessment: FramingAssessment,
  callId: string,
): MeetingLine[] {
  const t = fr.framingIntel;
  return assessment.dimensions.flatMap((d) =>
    d.questions.flatMap((q): MeetingLine[] => {
      const p = q.provenance;
      if (p?.kind !== "call" || p.callId !== callId || !q.display) return [];
      const by = q.confirmed?.by ?? "—";
      return [
        {
          id: q.key,
          topic: t.dimensions[d.dimension],
          kind: null,
          who: null,
          due: null,
          text: `${t.questions[q.key].label} : ${q.display}`,
          became: null,
          quote: p.quote,
          state: q.dismissed
            ? { kind: "discarded", by }
            : q.status === "known"
              ? { kind: "confirmed", by }
              : { kind: "pending" },
          internal: d.dimension === "budget",
        },
      ];
    }),
  );
}

/**
 * The framing exchange in « Démarrer le cadrage », once prepared (proto
 * prepGate « frame », then summaryBlock): the planned call, recorded and
 * processed in the card (ExchangeInPlace), with « Départ · Échange de
 * cadrage du … » once recorded; once filed by PO, the meeting and, when
 * everything said is settled in « Les 6 dimensions », the summary to the
 * participants.
 */
export async function FramingExchange({
  call,
  assessment,
  canEdit,
  ownerName,
  validatorName,
  mePersonId,
}: {
  call: FramingCallInfo;
  assessment: FramingAssessment;
  canEdit: boolean;
  ownerName: string | null;
  validatorName: string | null;
  mePersonId: string | null;
}) {
  const t = fr.framingJourney.start;
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
    const [planned, state] = await Promise.all([
      loadPlannedCall(call.callId),
      loadCallInPlace(call.callId),
    ]);
    if (!planned || !state) return departure;
    const inPlace = (
      <ExchangeInPlace
        planned={planned}
        goal={call.goal}
        state={state}
        recorded={call.recorded}
        canEdit={canEdit}
        ownerName={ownerName}
      />
    );
    // The planned call already says when: no « Départ » before it.
    if (!call.recorded) return inPlace;
    return (
      <div className="flex flex-col gap-5">
        {departure}
        {inPlace}
      </div>
    );
  }

  const [base, summaries] = await Promise.all([
    loadMeeting(call.callId, { name: t.meetingName, noun: "exchange" }),
    loadCallSummaries(call.callId),
  ]);
  if (!base) return departure;
  const lines = framingLines(assessment, call.callId);
  const meeting = {
    ...base,
    lines: [
      ...lines,
      // What follows the Cadrage, said by code (proto: « Le Brief de
      // cadrage part en validation auprès de … »).
      {
        id: "next-brief",
        topic: null,
        kind: "action" as const,
        who: validatorName,
        due: null,
        text: t.summaryNext,
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
      {departure}
      <MeetingFacts meeting={meeting} />
      {canEdit ? (
        (settled || summaries.length > 0) && (
          <MeetingSummaryBlock
            callId={call.callId}
            draft={summaryDraft(meeting, ownerName)}
            recipients={recipients}
            versions={summaries}
            canSend
            ownerName={ownerName}
          />
        )
      ) : (
        <MeetingSummaryFor
          summary={summaries[0] ?? null}
          callId={call.callId}
        />
      )}
    </div>
  );
}
