import { notFound } from "next/navigation";
import { IconLock } from "nucleo-sharp-essential";

import { FramingDictation } from "@/components/framing/framing-dictation";
import { FramingStepFrame } from "@/components/framing/framing-step-frame";
import { DimensionRows } from "@/components/framing/dimensions/dimension-rows";
import { FramingReturn } from "@/components/framing/dimensions/framing-return";
import { QuestionLines } from "@/components/framing/dimensions/question-lines";
import { QuestionScreen } from "@/components/framing/intel/question-screen";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { editableDimensions } from "@/lib/framing/analyse";
import { nextAfter, type QuestionState } from "@/lib/framing/assess";
import { linesOf } from "@/lib/framing/brief-snapshot";
import { legalPartyBoard } from "@/lib/framing/legal-parties";
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
 * Cadrage › Les 6 dimensions (proto « Suite du Cadrage », Sacha 29/10/2026;
 * ticket § 4 and § 6): for the one who answers, PO's one question (the next
 * one, or the one opened with « Répondre » / « Modifier » or the arrows,
 * ?q=), then the six dimensions folded under it, the dictation beside
 * them. How many are left is said once, in the step's « À vous » line.
 * Frozen while the direction reads the Brief; a correction reopens only
 * the dimensions it names (framing_dimension_editable).
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

  // The questions the viewer may open, in order: the arrows walk them.
  const reachable = assessment.dimensions
    .flatMap((d) => d.questions)
    .filter((q) => editableIn(q.dimension));
  const asked = first(sp.q);
  const question: QuestionState | null =
    (isQuestionKey(asked) && reachable.find((q) => q.key === asked)) ||
    (assessment.next && editableIn(assessment.next.dimension)
      ? assessment.next
      : null);
  const at = question ? reachable.indexOf(question) : -1;
  const hrefOf = (q: QuestionState | undefined) =>
    q ? routes.projectFramingQuestion(projectId, q.dimension, q.key) : null;
  const nextHref = (q: QuestionState) => {
    const next = nextAfter(assessment, q.key);
    return next
      ? routes.projectFramingQuestion(projectId, next.dimension, next.key)
      : routes.projectFramingStep(projectId, "brief");
  };
  const lines = Object.fromEntries(
    Object.keys(QUESTIONS).map((key) => [key, linesOf(key, k)]),
  );

  let box: React.ReactNode = null;
  if (question) {
    // A list question brings its lines; a single value opens its field.
    const kind = QUESTIONS[question.key].kind;
    const hasLines =
      question.key === "commitments" ||
      !(kind === "text" || kind === "date" || kind === "money");
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
          eyebrow={ti.dimensions[question.dimension]}
          nav={{
            position: at + 1,
            total: reachable.length,
            previous: hrefOf(reachable[at - 1]),
            next: hrefOf(reachable[at + 1]),
          }}
          editable
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
          {hasLines && (
            <QuestionLines
              projectId={projectId}
              question={question}
              k={k}
              editable
              nextHref={nextHref(question)}
            />
          )}
        </QuestionScreen>
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

  const heading = (
    <h3 id="dimension-rows" className="text-body-lg font-semibold">
      {t.listTitle}
    </h3>
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
        {box}
        <DimensionRows
          projectId={projectId}
          assessment={assessment}
          lines={lines}
          current={question?.key ?? null}
          editable={editableIn}
          parties={{ board: legalPartyBoard(k), members: k.framing.members }}
          header={
            canEdit && working && !correction ? (
              <FramingDictation projectId={projectId}>
                {heading}
              </FramingDictation>
            ) : (
              heading
            )
          }
        />
      </div>
    </FramingStepFrame>
  );
}
