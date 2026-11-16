import { PlannedCallInPlace } from "@/components/calls/prep/planned-call-in-place";
import { BriefExchanges } from "@/components/master-workflow/brief-exchanges";
import { BriefQuestions } from "@/components/master-workflow/brief-questions";
import { DocumentCard } from "@/components/ui/document-card";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { Fold } from "@/components/ui/fold";
import { PdfExportButton } from "@/components/ui/pdf-export-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { StepWaiting } from "@/components/shell/journey/step-waiting";
import type { CallPrepDefaults } from "@/lib/calls/prep/types";
import { masterBrief } from "@/lib/i18n/fr/master-brief";
import {
  briefStateOf,
  missingSentence,
} from "@/lib/master-workflow/brief-rules";
import type { BriefStepView } from "@/lib/master-workflow/brief-step";
import { questionStateOf } from "@/lib/master-workflow/question-types";
import { briefQuestionTone } from "@/lib/ui/state-tones";
import { formatShortDay } from "@/lib/utils/day";

import { BriefConditions } from "./brief-conditions";
import { BriefPeople, type BriefFactsProps } from "./brief-people";
import { BriefContent } from "./brief-content";
import { BriefExchange } from "./brief-exchange";
import { BriefRecord } from "./brief-record";
import { BriefStart } from "./brief-start";

const fr = { masterBrief };

const t = fr.masterBrief;
const STATE_TONE = {
  incomplete: "warning",
  draft: "neutral",
  ready: "success",
} as const;

const NAMES = new Intl.ListFormat("fr-FR", {
  style: "long",
  type: "conjunction",
});

const sectionTitle =
  "text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold";

/**
 * The Brief step (proto `master-v2.html`): how to start it, the exchange
 * or the question to the creative director, then the Brief as a document —
 * its state, what is missing, each fact with its source, changed in place —
 * and « Enregistrer le Brief ». For the person asked a question, the
 * question goes first (QuestionList, the step's lead) and the rest folds
 * under « Le Brief en cours » (lot 4 of Ibé's feedback).
 */
export function BriefStep({
  step,
  exchange,
  ownerName,
  projectTitle,
  lead = false,
}: {
  step: BriefStepView;
  // The viewer's open questions are shown at the head of the step.
  lead?: boolean;
  // The common call form's defaults, for the owner.
  exchange: CallPrepDefaults | null;
  ownerName: string | null;
  projectTitle: string;
}) {
  const { view } = step;
  const canEdit = view.canEdit;
  const asked = step.questions.questions.length > 0;
  const choosing =
    canEdit &&
    !step.recordedAt &&
    !step.startMode &&
    !asked &&
    view.exchanges.length === 0;
  const state = briefStateOf(
    step.missing,
    step.recordedAt !== null,
    step.dirty,
  );
  const missing = missingSentence(step.missing);
  // The newest exchange not processed yet is recorded and processed in the
  // step (PlannedCallInPlace, Sacha 07/11/2026); the others are listed.
  const current = view.exchanges.find((e) => e.status !== "ready") ?? null;
  const done = view.exchanges.filter((e) => e !== current);
  // Who PO asks the artistic direction (the creative directors, whoever
  // validates: _master_ask_direction), and where that question stands.
  const directionAsk = step.questions.toAsk.find(
    (q) => q.dimension === "direction",
  );
  const creatives = directionAsk
    ? NAMES.format(directionAsk.people.map((p) => p.name))
    : null;
  const directionQuestion =
    step.questions.questions.find(
      (q) => q.dimension === "direction" && !q.answeredAt,
    ) ??
    step.questions.questions.find(
      (q) => q.dimension === "direction" && !q.appliedAt,
    );
  // The questions left once the viewer's open ones went to the head.
  const others = lead
    ? step.questions.questions.filter((q) => !isOpenForViewer(q))
    : step.questions.questions;
  const facts: BriefFactsProps = {
    projectId: view.projectId,
    canEdit,
    peopleEditor: view.peopleEditor,
    validatedRounds: view.validatedRounds,
    canSeeBudget: view.canSeeBudget,
    brief: view.brief,
    engineers: view.engineers,
    others: view.others,
    members: view.members,
    canAddContact: view.canAddContact,
    validators: view.validators,
    designations: step.designations,
    changedBy: step.changedBy,
    usualRevisions: step.usualRevisions,
    usualRates: view.usualRates,
  };
  // The people first, as soon as the Master opens (Ibé, 02/11/2026).
  const people = (
    <section className="flex flex-col gap-2.5 modern:gap-2">
      <h3 className={sectionTitle}>{t.sections.people}</h3>
      <BriefPeople {...facts} />
    </section>
  );
  const body = (
    <>
      {choosing && (
        <>
          <FactRows>
            <FactRow
              label={t.prefilled.label}
              value={t.prefilled.value}
              source={t.prefilled.source}
            />
          </FactRows>
          {people}
          <BriefStart
            projectId={view.projectId}
            creatives={creatives}
            missing={step.missing}
          />
        </>
      )}
      {!choosing &&
        !canEdit &&
        !step.recordedAt &&
        ownerName &&
        !step.questions.questions.some((q) => q.isMine && !q.answeredAt) && (
          <StepWaiting who={ownerName} todo={t.ownerTodo} />
        )}

      {!choosing && (
        <DocumentCard
          name={t.pdf.fileName(projectTitle)}
          line={
            step.recordedAt
              ? `${t.document.saved(formatShortDay(step.recordedAt), step.recordedBy)}${step.dirty ? ` · ${t.document.dirty}` : ""}`
              : t.document.notSaved
          }
          action={
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={STATE_TONE[state]} size="sm">
                {t.document.states[state]}
              </StatusBadge>
              {step.saved && (
                <PdfExportButton
                  href={`/api/projects/${view.projectId}/master-brief`}
                  fileName={t.pdf.fileName(projectTitle)}
                  label={t.pdf.export}
                  pendingLabel={t.pdf.exporting}
                  failedLabel={t.pdf.failed}
                  variant="outline"
                  size="sm"
                />
              )}
            </div>
          }
        />
      )}

      {!choosing && people}

      {step.startMode === "exchange" &&
        view.exchanges.length === 0 &&
        exchange && (
          <BriefExchange projectId={view.projectId} defaults={exchange} />
        )}
      {current && (
        <PlannedCallInPlace callId={current.callId} noun="exchange" />
      )}
      {done.length > 0 && (
        <BriefExchanges
          projectId={view.projectId}
          exchanges={done}
          canEdit={canEdit}
        />
      )}
      {asked && others.length > 0 && (
        <BriefQuestions
          projectId={view.projectId}
          view={{ ...step.questions, questions: others }}
        />
      )}

      {!choosing && (
        <>
          {missing && <ToneCallout tone="warning">{missing}</ToneCallout>}
          {step.sentAt && (
            <ToneCallout tone="info">
              {t.document.sent(formatShortDay(step.sentAt))}
            </ToneCallout>
          )}
          <section className="flex flex-col gap-2.5 modern:gap-2">
            <h3 className={sectionTitle}>{t.sections.conditions}</h3>
            <BriefConditions {...facts} />
          </section>
          <BriefContent
            projectId={view.projectId}
            canEdit={canEdit}
            brief={view.brief}
            dates={step.dates}
            masterFinalFromFraming={step.masterFinalFromFraming}
            distributionFormats={view.distributionFormats}
            directionState={
              directionQuestion
                ? {
                    tone: briefQuestionTone[questionStateOf(directionQuestion)],
                    label: directionQuestion.answeredAt
                      ? t.directionAnswered(directionQuestion.askedTo.name)
                      : t.directionAsked(directionQuestion.askedTo.name),
                  }
                : null
            }
            changedBy={step.changedBy}
          />
          {canEdit && (
            <BriefRecord
              projectId={view.projectId}
              recorded={step.recordedAt !== null}
              dirty={step.dirty}
            />
          )}
        </>
      )}
    </>
  );
  return (
    <div className="flex flex-col gap-5">
      {lead ? <Fold summary={t.lead.more}>{body}</Fold> : body}
    </div>
  );
}

/** A question the viewer still has to answer. */
export const isOpenForViewer = (
  q: BriefStepView["questions"]["questions"][number],
) => q.isMine && !q.answeredAt;
