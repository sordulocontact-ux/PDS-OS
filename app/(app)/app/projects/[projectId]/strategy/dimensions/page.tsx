import { IconLock } from "nucleo-sharp-essential";
import { notFound } from "next/navigation";

import { MeetingFacts } from "@/components/calls/meeting/meeting-facts";
import { EditAccessProvider } from "@/components/projects/edit-access";
import { DimensionWork } from "@/components/strategy/dimension-work";
import { DimensionGroup } from "@/components/strategy/dimensions/dimension-group";
import { StrategyDictation } from "@/components/strategy/strategy-dictation";
import { StrategyDraftButton } from "@/components/strategy/strategy-draft-button";
import { DimensionList } from "@/components/ui/dimension-list";
import { UpstreamBlock } from "@/components/strategy/dimensions/upstream-block";
import { StrategyStepFrame } from "@/components/strategy/journey/strategy-step-frame";
import { StrategyQuestionBox } from "@/components/strategy/questions/strategy-question-box";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { loadMeeting } from "@/lib/calls/meeting/queries";
import { fr } from "@/lib/i18n/fr";
import { strategyMeetingLines } from "@/lib/strategy/meeting-lines";
import { currentQuestion, strategyQuestions } from "@/lib/strategy/questions";
import { strategyStepData } from "@/lib/strategy/step-data";
import { upstreamChains } from "@/lib/strategy/upstream";

/**
 * Stratégie › Les 8 dimensions (proto BODY_MK.st2, ticket § 2 to 7), on the
 * Cadrage's frame (DimensionList, Sacha 06/11/2026): the exchange it comes
 * from, PO's box while proposals wait, PO's one question (a written point
 * nothing answers, a lever to arbitrate, StrategyQuestionBox), the title with « n complétées · n à
 * arbitrer · n à compléter » and the dictation beside it, then each
 * dimension folded — one open — its proposals confirmed together
 * (« Confirmer les n »), each correctable or set aside, the ticket's detail
 * under its title, and « Ajouter … ».
 * Read-only for anyone but the owner and while the Brief is read by the
 * direction.
 */
export default async function StrategyDimensionsPage({
  params,
  searchParams,
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
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : undefined;
  // PO's one question (lib/strategy/questions.ts), for the owner while the
  // strategy is open: `?q=` the one asked, `?after=` the one answered.
  const questionInput = {
    fields: [
      ...data.fields,
      ...data.positioningParts,
      ...data.narrativeParts,
      data.strategicObjective,
    ],
    dimensions: model.dimensions,
  };
  const queue = canEdit && !frozen ? strategyQuestions(questionInput) : [];
  const question =
    canEdit && !frozen
      ? currentQuestion(queue, questionInput, one(sp.q), one(sp.after))
      : null;
  // The dimension open, as the Cadrage: the one asked (`?d=`, a link of the
  // step), else the question's, else the first with proposals to confirm,
  // else the one « À vous » points to.
  const asked = one(sp.d);
  const initial =
    (asked && model.dimensions.some((d) => d.key === asked) ? asked : null) ??
    question?.dimension ??
    model.dimensions.find((d) => d.toConfirm > 0)?.key ??
    model.firstToDecide ??
    model.firstToComplete ??
    model.dimensions[0].key;
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
          {frozen && (
            <ToneCallout tone="info" icon={<IconLock />}>
              {t.frozenCallout}
            </ToneCallout>
          )}
          {/* Started directly, the step says nothing of it: « Départ » is
              the first step's (Ibé 02/11/2026, « bruit à nettoyer »). */}
          {meeting && call && (
            <MeetingFacts
              meeting={{
                ...meeting,
                // Its lines are the dimensions' proposals: always there.
                reportReady: true,
                lines: strategyMeetingLines(
                  model,
                  routes.projectCall(projectId, call.callId),
                ),
              }}
            />
          )}
          {question ? (
            <StrategyQuestionBox
              projectId={projectId}
              queue={queue}
              current={question}
            />
          ) : (
            canEdit &&
            !frozen && (
              <ToneCallout tone="success">
                {fr.strategyQuestions.done}
              </ToneCallout>
            )
          )}
          <DimensionList
            labelledBy="strategy-dimensions"
            header={
              <StrategyDictation
                projectId={projectId}
                actions={<StrategyDraftButton projectId={projectId} />}
              >
                <h3
                  id="strategy-dimensions"
                  className="text-body-lg font-semibold"
                >
                  {t.listTitle}
                </h3>
                <p className="text-caption text-[color:var(--text-secondary)]">
                  {t.counter(
                    count("complete"),
                    count("to_decide"),
                    count("to_complete"),
                  )}
                </p>
              </StrategyDictation>
            }
          >
            {model.dimensions.map((view) => (
              <DimensionGroup
                key={view.key}
                projectId={projectId}
                view={view}
                canEdit={canEdit}
                exchange={exchange}
                open={view.key === initial}
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
          </DimensionList>
        </div>
      </EditAccessProvider>
    </StrategyStepFrame>
  );
}
