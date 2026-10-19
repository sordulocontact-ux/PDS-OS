import { CallFacts } from "@/components/calls/call-facts";
import { MeetingFacts } from "@/components/calls/meeting/meeting-facts";
import { MeetingSummaryBlock } from "@/components/calls/meeting/meeting-summary-block";
import { MeetingSummaryFor } from "@/components/calls/meeting/meeting-summary-for";
import { CallPrepForm } from "@/components/calls/prep/call-prep-form";
import { PlannedCallFacts } from "@/components/calls/prep/planned-call-facts";
import { ToneCallout } from "@/components/ui/tone-callout";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { summaryDraft } from "@/lib/calls/meeting/draft";
import { loadCallSummaries, loadMeeting } from "@/lib/calls/meeting/queries";
import type { MeetingLine } from "@/lib/calls/meeting/types";
import { loadPlannedCall } from "@/lib/calls/prep/planned";
import { fr } from "@/lib/i18n/fr";
import { productionCallDefaults } from "@/lib/production/call-prep-defaults";
import type { CallItem, PreprodData } from "@/lib/production/preprod/types";
import type { ProductionSheetData } from "@/lib/production/sheet";

const t = fr.productionCall.step;

// What became of each line of the report, as the step settled it.
function statesOf(items: CallItem[]): Record<string, MeetingLine["state"]> {
  return Object.fromEntries(
    items.flatMap((i) => {
      const id = i.sourceReportItemId;
      if (!id) return [];
      const by = i.reviewedBy ?? "—";
      return [
        [
          id,
          i.status === "confirmed"
            ? { kind: "confirmed" as const, by }
            : i.status === "rejected"
              ? { kind: "discarded" as const, by }
              : { kind: "pending" as const },
        ],
      ];
    }),
  );
}

/**
 * The head of « Call de production » / « Préparation avec PO » /
 * « Organisation importée » (proto prepGate and BODY_MK.kickoff): with a
 * call, the common form in the step until it is created, then the planned
 * call, then the meeting held (« Lire le compte rendu », point by point);
 * PO's box while points wait. `summary`: the summary to the participants,
 * once what was said is settled (the owner writes, others read).
 */
export async function CallStepHead({
  projectId,
  data,
  preprod,
  canOrganize,
  creatives,
}: {
  projectId: string;
  data: ProductionSheetData;
  preprod: PreprodData;
  canOrganize: boolean;
  creatives: string[];
}) {
  const sheet = data.sheet;
  if (!sheet) return null;
  const proposed = preprod.items.filter((i) => i.status === "proposed").length;
  const po = proposed > 0 && (
    <ToneCallout tone="info">{t.po[sheet.mode]}</ToneCallout>
  );
  if (sheet.mode !== "call")
    return (
      <>
        <CallFacts
          facts={[
            sheet.mode === "direct"
              ? { label: t.direct, value: t.directValue }
              : { label: t.imported, value: t.imported },
          ]}
        />
        {po}
      </>
    );
  const call = preprod.calls[0] ?? null;
  if (!call) {
    const defaults = canOrganize
      ? await productionCallDefaults(projectId, data, creatives)
      : null;
    return defaults ? <CallPrepForm defaults={defaults} stay /> : null;
  }
  if (call.status !== "ready") {
    const planned = await loadPlannedCall(call.callId);
    if (!planned) return null;
    return planned.held ? (
      <div className="flex flex-col gap-2">
        <p className="text-[color:var(--text-secondary)]">{t.processing}</p>
        <ViewLink
          href={routes.projectCall(projectId, call.callId)}
          className="self-start font-semibold underline underline-offset-2"
        >
          {t.openCall}
        </ViewLink>
      </div>
    ) : (
      <PlannedCallFacts
        call={planned}
        noun="call"
        waiting={
          canOrganize ? null : { name: data.ownerName ?? "—", what: t.hold }
        }
      />
    );
  }
  const meeting = await loadMeeting(call.callId, {
    name: t.meetingName,
    noun: "call",
    states: statesOf(preprod.items.filter((i) => i.callId === call.callId)),
  });
  return meeting ? (
    <>
      <MeetingFacts meeting={meeting} />
      {po}
    </>
  ) : null;
}

/** « Résumé pour les participants » of the production call, once its
 * points are settled (proto summaryBlock); others read what they got. */
export async function CallStepSummary({
  data,
  preprod,
  canOrganize,
  mePersonId,
}: {
  data: ProductionSheetData;
  preprod: PreprodData;
  canOrganize: boolean;
  mePersonId: string | null;
}) {
  const call = preprod.calls[0] ?? null;
  if (data.sheet?.mode !== "call" || call?.status !== "ready") return null;
  const items = preprod.items.filter((i) => i.callId === call.callId);
  const [meeting, summaries] = await Promise.all([
    loadMeeting(call.callId, {
      name: t.meetingName,
      noun: "call",
      states: statesOf(items),
    }),
    loadCallSummaries(call.callId),
  ]);
  if (!meeting) return null;
  const settled = items.every((i) => i.status !== "proposed");
  if (!canOrganize) return <MeetingSummaryFor summary={summaries[0] ?? null} />;
  if (!settled && summaries.length === 0) return null;
  return (
    <MeetingSummaryBlock
      callId={call.callId}
      draft={summaryDraft(meeting, data.ownerName)}
      recipients={meeting.participants.filter(
        (p) => p.key !== `m:${mePersonId}`,
      )}
      versions={summaries}
      canSend
      ownerName={data.ownerName}
    />
  );
}
