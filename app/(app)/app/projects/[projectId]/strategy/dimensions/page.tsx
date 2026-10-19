import { notFound } from "next/navigation";

import { CallFacts } from "@/components/calls/call-facts";
import { MeetingReportDialog } from "@/components/calls/meeting/meeting-report-dialog";
import { EditAccessProvider } from "@/components/projects/edit-access";
import { DimensionWork } from "@/components/strategy/dimension-work";
import { DimensionGroup } from "@/components/strategy/dimensions/dimension-group";
import { StrategyDictation } from "@/components/strategy/strategy-dictation";
import { StrategyDraftButton } from "@/components/strategy/strategy-draft-button";
import { Fold } from "@/components/ui/fold";
import { UpstreamBlock } from "@/components/strategy/dimensions/upstream-block";
import { StrategyStepFrame } from "@/components/strategy/journey/strategy-step-frame";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { loadMeeting } from "@/lib/calls/meeting/queries";
import { callWhen } from "@/lib/calls/prep/dates";
import { fr } from "@/lib/i18n/fr";
import { strategyMeetingLines } from "@/lib/strategy/meeting-lines";
import { strategyStepData } from "@/lib/strategy/step-data";
import { upstreamChains } from "@/lib/strategy/upstream";

/**
 * Stratégie › Les 8 dimensions (proto BODY_MK.st2, ticket § 2 to 7): the
 * exchange it comes from, PO's box while proposals wait, « n complétées ·
 * n à arbitrer · n à compléter », then each dimension with its lines
 * decided one by one and « Ajouter … ». Read-only for anyone but the owner
 * and while the Brief is read by the direction.
 */
export default async function StrategyDimensionsPage({
  params,
}: PageProps<"/app/projects/[projectId]/strategy/dimensions">) {
  const { projectId } = await params;
  const ctx = await strategyStepData(projectId);
  if (!ctx) notFound();
  const { model, call, data, budget, canEdit, project, access } = ctx;
  const t = fr.strategyDimensions;
  const exchange = Boolean(call?.reported);
  const meeting =
    call && call.reported
      ? await loadMeeting(call.callId, {
          name: fr.strategyJourney.start.meetingName,
          noun: "exchange",
        })
      : null;
  const count = (state: string) =>
    model.dimensions.filter((d) => d.state === state).length;
  const frozen = ctx.latest?.state === "sent";
  const chains = upstreamChains(
    data.milestones.map((m) => ({
      id: m.id,
      title: m.title,
      occursOn: m.occurs_on,
      deliverableId: m.deliverable_id,
    })),
    data.deliverables,
    ctx.today,
  );

  return (
    <StrategyStepFrame
      projectId={projectId}
      stepKey="dimensions"
      po={
        model.pending > 0 ? (
          <ToneCallout tone="info" as="div">
            <strong className="font-semibold">PO</strong> {t.po}
          </ToneCallout>
        ) : undefined
      }
    >
      <EditAccessProvider canEdit={canEdit}>
        <div className="flex flex-col gap-4">
          <CallFacts
            facts={
              meeting && call
                ? [
                    {
                      label: t.exchange,
                      value: fr.meeting.facts(
                        callWhen(meeting.occurredAt),
                        meeting.format
                          ? fr.callPrep.formats[meeting.format]
                          : null,
                        meeting.participants.map((p) => p.name).join(", "),
                      ),
                    },
                    {
                      label: t.report,
                      value: (
                        <MeetingReportDialog
                          meeting={{
                            ...meeting,
                            lines: strategyMeetingLines(
                              model,
                              routes.projectCall(projectId, call.callId),
                            ),
                          }}
                        />
                      ),
                    },
                  ]
                : [{ label: t.departure, value: t.departureDirect }]
            }
          />
          <p className="text-body-sm font-semibold">
            {t.counter(
              count("complete"),
              count("to_decide"),
              count("to_complete"),
            )}
            {frozen && (
              <span className="font-medium text-[color:var(--text-secondary)]">
                {t.frozen}
              </span>
            )}
          </p>
          {canEdit && (
            // MKT-S1-09 (« Préparer un brouillon ») and the dictation:
            // kept, folded, as the proto has neither.
            <Fold summary={t.details.withPo}>
              <StrategyDictation
                projectId={projectId}
                actions={<StrategyDraftButton projectId={projectId} />}
              >
                <p className="text-caption text-[color:var(--text-secondary)]">
                  {t.withPoBody}
                </p>
              </StrategyDictation>
            </Fold>
          )}
          {model.dimensions.map((view) => (
            <DimensionGroup
              key={view.key}
              projectId={projectId}
              view={view}
              canEdit={canEdit}
              exchange={exchange}
              extra={
                view.key === "calendar" ? (
                  <UpstreamBlock chains={chains} />
                ) : undefined
              }
              details={
                <DimensionWork
                  dimension={view.key}
                  data={data}
                  budget={budget}
                  envelopeCents={project.budgetCents}
                  projectId={projectId}
                  organizationId={access.organizationId}
                />
              }
            />
          ))}
        </div>
      </EditAccessProvider>
    </StrategyStepFrame>
  );
}
