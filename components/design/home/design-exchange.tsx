import { CallFacts, CallSource } from "@/components/calls/call-facts";
import { MeetingSummaryBlock } from "@/components/calls/meeting/meeting-summary-block";
import { MeetingSummaryFor } from "@/components/calls/meeting/meeting-summary-for";
import { PlannedCallFacts } from "@/components/calls/prep/planned-call-facts";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { meetingSettled, summaryDraft } from "@/lib/calls/meeting/draft";
import { loadCallSummaries, loadMeeting } from "@/lib/calls/meeting/queries";
import type { MeetingLine } from "@/lib/calls/meeting/types";
import { loadPlannedCall } from "@/lib/calls/prep/planned";
import type { DesignJourneyContext } from "@/lib/design/journey-context";
import { designJourney } from "@/lib/i18n/fr/design-journey";
import { designSteps } from "@/lib/i18n/fr/design-steps";
import { formatDay } from "@/lib/utils/day";

const fr = { designJourney, designSteps };

const t = fr.designSteps.home.start;

/**
 * What PO filed from the creative exchange, as meeting lines: one per
 * intention heard, under its target; the state is the Intentions step's
 * (confirmed, or still to confirm).
 */
function designLines(ctx: DesignJourneyContext, callId: string): MeetingLine[] {
  const source = ctx.data.sources.find((s) => s.callId === callId);
  if (!source) return [];
  const creative = ctx.creative?.name ?? "—";
  const titleOf = (id: string | null) =>
    ctx.data.deliverables.find((d) => d.id === id)?.title ?? null;
  return ctx.data.intentions
    .filter((i) => i.sourceId === source.id)
    .map((i) => ({
      id: i.id,
      topic:
        i.target === "direction"
          ? fr.designSteps.intentions.direction
          : titleOf(i.deliverableId),
      kind: null,
      who: null,
      due: null,
      text: i.value,
      became: null,
      quote: i.sourceQuote,
      state:
        i.status === "confirmed"
          ? { kind: "confirmed", by: creative }
          : { kind: "pending" },
    }));
}

/**
 * The creative exchange in the Accueil, once created (proto prepGate
 * « design », then summaryBlock): the planned exchange (recorded in PDS OS
 * from its page), the processing, then « Échange créatif du … · Compte
 * rendu disponible » and — once every intention heard is settled — the
 * summary to the participants, versioned.
 */
export async function DesignExchange({ ctx }: { ctx: DesignJourneyContext }) {
  const call = ctx.call;
  if (!call) return null;
  if (!call.held) {
    const planned = await loadPlannedCall(call.callId);
    if (!planned) return null;
    if (!call.recorded)
      return (
        <PlannedCallFacts
          call={planned}
          noun="exchange"
          waiting={
            ctx.isOwner
              ? null
              : {
                  name: ctx.owner?.name ?? "—",
                  what: fr.designJourney.todo.holdCall.toLowerCase(),
                }
          }
        />
      );
    return (
      <div className="flex flex-col gap-3">
        <p className="text-body-md text-[color:var(--text-secondary)]">
          {t.processing}
        </p>
        <ViewLink
          href={routes.projectCall(ctx.project.id, call.callId)}
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
  const held = (
    <CallFacts
      facts={[
        {
          label: t.departure,
          value: (
            <>
              {t.exchangeOf(formatDay(call.occurredAt))}{" "}
              <CallSource>{t.exchangeReady}</CallSource>
            </>
          ),
        },
      ]}
    />
  );
  if (!base) return held;
  const meeting = {
    ...base,
    lines: [
      ...designLines(ctx, call.callId),
      // What follows, said by code (proto: « Nadia Benali soumet la
      // direction artistique à Claire Morel »).
      {
        id: "next-direction",
        topic: null,
        kind: "action" as const,
        who: ctx.creative?.name ?? null,
        due: null,
        text: t.summaryNext(
          ctx.creative?.name ?? "—",
          ctx.validator?.name ?? "—",
        ),
        became: null,
        quote: null,
        state: { kind: "confirmed" as const, by: ctx.owner?.name ?? "—" },
      },
    ],
  };
  const recipients = meeting.participants.filter(
    (p) => p.key !== `m:${ctx.access.personId}`,
  );
  return (
    <div className="flex flex-col gap-5">
      {held}
      {ctx.isOwner ? (
        (meetingSettled(meeting) || summaries.length > 0) && (
          <MeetingSummaryBlock
            callId={call.callId}
            draft={summaryDraft(meeting, ctx.owner?.name ?? null)}
            recipients={recipients}
            versions={summaries}
            canSend
            ownerName={ctx.owner?.name ?? null}
          />
        )
      ) : (
        <MeetingSummaryFor summary={summaries[0] ?? null} />
      )}
    </div>
  );
}
