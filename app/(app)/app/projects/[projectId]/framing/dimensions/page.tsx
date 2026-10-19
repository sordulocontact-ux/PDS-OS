import { notFound } from "next/navigation";
import { IconLock } from "nucleo-sharp-essential";

import { FramingDictation } from "@/components/framing/framing-dictation";
import { FramingStepFrame } from "@/components/framing/framing-step-frame";
import { DimensionCards } from "@/components/framing/dimensions/dimension-cards";
import { FramingReturn } from "@/components/framing/dimensions/framing-return";
import { QuestionLines } from "@/components/framing/dimensions/question-lines";
import { QuestionScreen } from "@/components/framing/intel/question-screen";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { editableDimensions } from "@/lib/framing/analyse";
import { nextAfter, type QuestionState } from "@/lib/framing/assess";
import { linesOf } from "@/lib/framing/brief-snapshot";
import { isOpenRequest, requestsAt } from "@/lib/framing/brief-request-view";
import { loadBriefRequests } from "@/lib/framing/brief-requests";
import {
  isQuestionKey,
  QUESTIONS,
  type Dimension,
} from "@/lib/framing/dimensions";
import type { HelpSuggestion } from "@/lib/framing/help";
import { framingJourneyContext } from "@/lib/framing/journey-context";
import { fr } from "@/lib/i18n/fr";

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/**
 * Cadrage › Les 6 dimensions (proto frDims, ticket § 4 and § 6): the human
 * confirmation so far, PO's one question (the next one, or the one chosen
 * with « Répondre », ?q=), then the six dimensions at a glance. Frozen
 * while the direction reads the Brief; a correction reopens only the
 * dimensions it names (framing_dimension_editable).
 */
export default async function FramingDimensionsPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/framing/dimensions">) {
  const { projectId } = await params;
  const sp = await searchParams;
  const [ctx, loadedRequests] = await Promise.all([
    framingJourneyContext(projectId),
    loadBriefRequests(projectId),
  ]);
  if (!ctx) notFound();
  const { k, assessment, stage, canEdit } = ctx;
  const t = fr.framingJourney.dimensions;
  const ti = fr.framingIntel;
  const working = stage === "not_started" || stage === "in_progress";
  const frozen = stage === "awaiting_validation";
  const open = editableDimensions(k);
  const editableIn = (d: string) => canEdit && working && open(d as Dimension);
  const openRequests = (loadedRequests ?? []).filter(isOpenRequest);
  const latest = k.briefs[0];
  const correction = latest?.state === "changes_requested";

  const all = assessment.dimensions.flatMap((d) => d.questions);
  const asked = first(sp.q);
  const question: QuestionState | null = frozen
    ? null
    : (isQuestionKey(asked) && all.find((q) => q.key === asked)) ||
      assessment.next;
  const nextHref = (q: QuestionState) => {
    const next = nextAfter(assessment, q.key);
    return next
      ? routes.projectFramingQuestion(projectId, next.dimension, next.key)
      : routes.projectFramingStep(projectId, "brief");
  };
  const lines = Object.fromEntries(
    Object.keys(QUESTIONS).map((key) => [key, linesOf(key, k)]),
  );
  const complete = assessment.dimensions.filter(
    (d) => d.status === "known",
  ).length;

  let box: React.ReactNode = null;
  if (question) {
    const editable = editableIn(question.dimension);
    const suggestionsRow = k.framing.briefRows.find(
      (r) =>
        r.field_key === `${question.key}_suggestions` &&
        r.status === "proposed",
    );
    const suggestions = ((
      suggestionsRow?.value as { items?: HelpSuggestion[] } | null
    )?.items ?? []) as HelpSuggestion[];
    const timingSaid = k.framing.fields.find((f) => f.key === "timing")?.value;
    const asking = [
      ...requestsAt(openRequests, question.dimension, question.key),
      ...requestsAt(openRequests, question.dimension, null),
    ];
    box = (
      <>
        {asking.length > 0 && (
          <ToneCallout tone="warning">
            <span className="flex flex-col gap-1">
              <span className="font-semibold">
                {fr.briefRequests.atQuestion}
              </span>
              {asking.map((r) => (
                <span key={r.id} className="whitespace-pre-line">
                  {r.body}
                </span>
              ))}
            </span>
          </ToneCallout>
        )}
        <QuestionScreen
          key={`${question.key}-${question.status}-${question.display ?? ""}`}
          projectId={projectId}
          question={question}
          eyebrow={ti.guide.capital(
            ti.dimensions[question.dimension],
            question.status === "missing",
          )}
          editable={editable}
          nextHref={nextHref(question)}
          suggestions={suggestions}
          itemPresets={[
            ...ti.itemPresets,
            ...Object.values(fr.framing.needs.presets),
          ]}
          hint={
            question.key === "target_date" && timingSaid
              ? ti.sources.timingSaid(timingSaid)
              : null
          }
        >
          <QuestionLines
            projectId={projectId}
            question={question}
            k={k}
            editable={editable}
            nextHref={nextHref(question)}
          />
        </QuestionScreen>
        {canEdit && working && !editable && (
          <ToneCallout tone="neutral">{ti.guide.locked}</ToneCallout>
        )}
      </>
    );
  } else if (!frozen && assessment.ready)
    box = (
      <ToneCallout tone="success">
        <span>
          <b>{t.done}</b> {t.doneBody}
        </span>
      </ToneCallout>
    );

  const progress = (
    <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)] tabular-nums">
      <b className="font-semibold text-foreground">
        {t.progress(assessment.counts.known, assessment.total)}
      </b>
      {t.complete6(complete)}
    </p>
  );

  return (
    <FramingStepFrame
      projectId={projectId}
      stepKey="dimensions"
      returned={
        <FramingReturn
          projectId={projectId}
          requests={openRequests}
          comment={correction ? (latest.change_comment ?? null) : null}
          reopened={correction ? (latest.reopened_dimensions ?? []) : []}
          by={latest?.decidedByName ?? null}
        />
      }
    >
      <div className="flex flex-col gap-4">
        {frozen && (
          <ToneCallout tone="info" icon={<IconLock />}>
            {t.frozen(ctx.validator?.name ?? "—")}
          </ToneCallout>
        )}
        {canEdit && working && !correction ? (
          <FramingDictation projectId={projectId}>{progress}</FramingDictation>
        ) : (
          progress
        )}
        {!canEdit && working && question && (
          <p className="text-caption text-[color:var(--text-tertiary)]">
            {t.waiting(ctx.project.ownerName ?? "—")}
          </p>
        )}
        {box}
        <DimensionCards
          projectId={projectId}
          assessment={assessment}
          lines={lines}
          current={question?.key ?? null}
          editable={editableIn}
          modifiable={correction}
        />
      </div>
    </FramingStepFrame>
  );
}
