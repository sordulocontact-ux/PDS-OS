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
import { needsSomeone, type QuestionState } from "@/lib/framing/assess";
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
 * ticket § 4 and § 6): for the one who answers, PO's one question — only
 * what nobody can confirm at a glance, the arrows walking those — or the
 * line opened from the list (?q=); then the six dimensions, where PO's
 * proposals are checked and confirmed a dimension at a time
 * (lib/framing/verify.ts), the dictation beside them. How many are left is
 * said once, in the step's « À vous » line.
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
  const { k, assessment, stage, canEdit, verify } = ctx;
  const t = fr.framingJourney.dimensions;
  const ti = fr.framingIntel;
  const working = stage === "not_started" || stage === "in_progress";
  const frozen = stage === "awaiting_validation";
  const open = editableDimensions(k);
  const editableIn = (d: string) => canEdit && working && open(d as Dimension);
  const openRequests = (loadedRequests ?? []).filter(isOpenRequest);
  const latest = k.briefs[0];
  const correction = latest?.state === "changes_requested";

  // The lines the viewer may open, in order; PO's proposals are checked in
  // the list, the arrows walk the rest.
  const reachable = assessment.dimensions
    .flatMap((d) => d.questions)
    .filter((q) => editableIn(q.dimension));
  const checked = verify.filter((q) => editableIn(q.dimension));
  const verified = new Set(checked.map((q) => q.key));
  const questions = reachable.filter((q) => !verified.has(q.key));
  const asked = first(sp.q);
  const question: QuestionState | null =
    (isQuestionKey(asked) && reachable.find((q) => q.key === asked)) ||
    questions.find(needsSomeone) ||
    null;
  const at = question ? questions.indexOf(question) : -1;
  const hrefOf = (q: QuestionState | undefined) =>
    q ? routes.projectFramingQuestion(projectId, q.dimension, q.key) : null;
  // After a gesture: the next question; else the list while proposals are
  // left to check; else the Brief.
  const nextHref = (q: QuestionState) => {
    const from = questions.indexOf(q);
    const next = [...questions.slice(from + 1), ...questions.slice(0, from)]
      .filter((x) => x !== q)
      .find(needsSomeone);
    if (next) return hrefOf(next)!;
    return checked.some((x) => x !== q)
      ? routes.projectFramingStep(projectId, "dimensions")
      : routes.projectFramingStep(projectId, "brief");
  };
  // Confirming a dimension's proposals ends the step when they are all
  // that is left.
  const dimensionsLeft = new Set(checked.map((q) => q.dimension));
  const lastDimension =
    dimensionsLeft.size === 1 &&
    !questions.some(needsSomeone) &&
    assessment.conflicts.length === 0
      ? checked[0].dimension
      : null;
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
          nav={
            at >= 0
              ? {
                  position: at + 1,
                  total: questions.length,
                  previous: hrefOf(questions[at - 1]),
                  next: hrefOf(questions[at + 1]),
                }
              : undefined
          }
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
          verify={checked.map((q) => q.key)}
          openFirst={asked ? null : (checked[0]?.dimension ?? null)}
          lastDimension={lastDimension}
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
