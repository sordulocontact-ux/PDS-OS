import { notFound } from "next/navigation";

import { CallFacts } from "@/components/calls/call-facts";
import { MeetingFacts } from "@/components/calls/meeting/meeting-facts";
import { DesignStepFrame } from "@/components/design/design-step-frame";
import { IntentionGroup } from "@/components/design/intentions/intention-group";
import { DesignWaits } from "@/components/design/waiting-row";
import { ImportBriefDialog } from "@/components/design/work/import-brief-dialog";
import { UnassignedProposals } from "@/components/design/work/proposals";
import { PoCallout } from "@/components/ui/po-callout";
import { loadMeeting } from "@/lib/calls/meeting/queries";
import { designJourneyContext } from "@/lib/design/journey-context";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import { formatDay } from "@/lib/utils/day";

const t = fr.designSteps.intentions;

/** The launch calendar's milestones, for « Temps forts ». */
async function loadMilestones(projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("milestones")
    .select("id, title, occurs_on")
    .eq("project_id", projectId)
    .order("occurs_on");
  return data ?? [];
}

/**
 * Conception › Intentions (proto de1, ticket § 3 and 4): what PDS OS knows
 * (or the creative exchange and its report), then one group for the
 * release's direction and one per deliverable — PO's proposals with the
 * exact sentence, confirmed one by one by the responsible créatif, until
 * the direction is submitted.
 */
export default async function DesignIntentionsPage({
  params,
}: PageProps<"/app/projects/[projectId]/design/intentions">) {
  const { projectId } = await params;
  const ctx = await designJourneyContext(projectId);
  if (!ctx) notFound();
  const { data, start } = ctx;
  const step = ctx.steps[1];
  const canEdit =
    data.canWrite &&
    ctx.directionPhase !== "pending" &&
    ctx.directionPhase !== "approved";
  const proposed = data.intentions.filter((i) => i.status === "proposed");
  const fromCall = start.path === "call" && ctx.call;
  const [meeting, milestones] = await Promise.all([
    fromCall
      ? loadMeeting(ctx.call!.callId, {
          name: fr.designSteps.home.start.meetingName,
          noun: "exchange",
        })
      : null,
    fromCall ? [] : loadMilestones(projectId),
  ]);

  const facts = fromCall
    ? [
        {
          label: t.facts.exchange,
          value: t.facts.exchangeValue(
            formatDay(ctx.call!.occurredAt),
            meeting?.format ? t.formats[meeting.format] : "",
            meeting?.minutes ?? null,
          ),
        },
      ]
    : [
        {
          label: t.facts.roles,
          value: data.deliverables.map((d) => d.title).join(", ") || "—",
        },
        { label: t.facts.audiences, value: data.known.audiences ?? "—" },
        { label: t.facts.narrative, value: data.known.narrative ?? "—" },
        {
          label: t.facts.milestones,
          value: milestones.length ? (
            <span className="flex flex-col">
              {milestones.map((m) => (
                <span key={m.id}>
                  {m.title} · {formatDay(m.occurs_on)}
                </span>
              ))}
            </span>
          ) : (
            "—"
          ),
        },
      ];

  return (
    <DesignStepFrame
      projectId={projectId}
      stepKey="intentions"
      po={
        proposed.length > 0 ? (
          <PoCallout>{t.poCall}</PoCallout>
        ) : start.path === "direct" && data.intentions.length === 0 ? (
          <PoCallout>{t.poDirect}</PoCallout>
        ) : undefined
      }
    >
      {/* The exchange's report as a document (Sacha 05/11/2026). */}
      {meeting ? (
        <MeetingFacts meeting={meeting} />
      ) : (
        <CallFacts facts={facts} />
      )}
      {canEdit && start.path === "direct" && (
        <div className="flex justify-end">
          <ImportBriefDialog projectId={projectId} />
        </div>
      )}
      <IntentionGroup
        projectId={projectId}
        data={data}
        deliverableId={null}
        title={t.direction}
        canEdit={canEdit}
      />
      {data.deliverables.map((d) => (
        <IntentionGroup
          key={d.id}
          projectId={projectId}
          data={data}
          deliverableId={d.id}
          title={d.title}
          canEdit={canEdit}
        />
      ))}
      <UnassignedProposals
        data={{ ...data, canWrite: canEdit }}
        projectId={projectId}
      />
      <DesignWaits step={step} actors={[step.actor]} />
    </DesignStepFrame>
  );
}
