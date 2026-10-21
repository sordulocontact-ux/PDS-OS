import { BriefExchanges } from "@/components/master-workflow/brief-exchanges";
import { BriefQuestions } from "@/components/master-workflow/brief-questions";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { PdfExportButton } from "@/components/ui/pdf-export-button";
import { ToneCallout } from "@/components/ui/tone-callout";
import type { CallPrepDefaults } from "@/lib/calls/prep/types";
import { fr } from "@/lib/i18n/fr";
import {
  briefStateOf,
  missingSentence,
} from "@/lib/master-workflow/brief-rules";
import type { BriefStepView } from "@/lib/master-workflow/brief-step";
import { formatShortDay } from "@/lib/utils/day";

import { BriefConditions } from "./brief-conditions";
import { BriefContent } from "./brief-content";
import { BriefExchange } from "./brief-exchange";
import { BriefRecord } from "./brief-record";
import { BriefStart } from "./brief-start";

const t = fr.masterBrief;
const STATE_TONE = {
  incomplete: "warning",
  draft: "neutral",
  ready: "success",
} as const;

const sectionTitle =
  "text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold";

/**
 * The Brief step (proto `master-v2.html`): how to start it, the exchange
 * or the question to the creative director, then the Brief as a document —
 * its state, what is missing, each fact with its source, changed in place —
 * and « Enregistrer le Brief ».
 */
export function BriefStep({
  step,
  exchange,
  ownerName,
  projectTitle,
}: {
  step: BriefStepView;
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
  const validator = view.validators.find(
    (v) => v.personId === view.brief.validatorPersonId,
  );
  const state = briefStateOf(
    step.missing,
    step.recordedAt !== null,
    step.dirty,
  );
  const missing = missingSentence(step.missing);
  return (
    <div className="flex flex-col gap-5">
      {choosing && (
        <>
          <FactRows>
            <FactRow
              label={t.prefilled.label}
              value={t.prefilled.value}
              source={t.prefilled.source}
            />
          </FactRows>
          <BriefStart
            projectId={view.projectId}
            validator={
              validator && step.designations.validator?.kind !== "owner"
                ? validator.name
                : null
            }
            missing={step.missing}
          />
        </>
      )}
      {!choosing &&
        !canEdit &&
        !step.recordedAt &&
        ownerName &&
        !step.questions.questions.some((q) => q.isMine && !q.answeredAt) && (
          <ToneCallout tone="info">{t.waitingOwner(ownerName)}</ToneCallout>
        )}

      {step.startMode === "exchange" &&
        view.exchanges.length === 0 &&
        exchange && (
          <BriefExchange projectId={view.projectId} defaults={exchange} />
        )}
      {view.exchanges.length > 0 && (
        <BriefExchanges
          projectId={view.projectId}
          exchanges={view.exchanges}
          canEdit={canEdit}
        />
      )}
      {asked && (
        <BriefQuestions projectId={view.projectId} view={step.questions} />
      )}

      {!choosing && (
        <>
          <FactRows>
            <FactRow
              label={t.document.title}
              value={
                step.recordedAt
                  ? t.document.saved(
                      formatShortDay(step.recordedAt),
                      step.recordedBy,
                    )
                  : t.document.notSaved
              }
              source={step.dirty && step.recordedAt ? t.document.dirty : null}
              state={{
                tone: STATE_TONE[state],
                label: t.document.states[state],
              }}
              side={
                step.saved && (
                  <PdfExportButton
                    href={`/api/projects/${view.projectId}/master-brief`}
                    fileName={t.pdf.fileName(projectTitle)}
                    label={t.pdf.export}
                    pendingLabel={t.pdf.exporting}
                    failedLabel={t.pdf.failed}
                    variant="outline"
                  />
                )
              }
            />
          </FactRows>
          {missing && <ToneCallout tone="warning">{missing}</ToneCallout>}
          {step.sentAt && (
            <ToneCallout tone="info">
              {t.document.sent(formatShortDay(step.sentAt))}
            </ToneCallout>
          )}
          <section className="flex flex-col gap-2.5">
            <h3 className={sectionTitle}>{t.sections.conditions}</h3>
            <BriefConditions
              projectId={view.projectId}
              canEdit={canEdit}
              canSeeBudget={view.canSeeBudget}
              brief={view.brief}
              engineers={view.engineers}
              members={view.members}
              validators={view.validators}
              designations={step.designations}
              changedBy={step.changedBy}
            />
          </section>
          <BriefContent
            projectId={view.projectId}
            canEdit={canEdit}
            brief={view.brief}
            dates={step.dates}
            masterFinalFromFraming={step.masterFinalFromFraming}
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
    </div>
  );
}
