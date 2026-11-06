"use client";

import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { PoQuestion, type PoQuestionNav } from "@/components/ui/po-question";
import { PoReading } from "@/components/ui/po-reading";
import { ToneCallout } from "@/components/ui/tone-callout";
import { VoiceFieldControl } from "@/components/voice/voice-field-control";
import { auth } from "@/lib/i18n/fr/auth";
import { legal } from "@/lib/i18n/fr/legal";
import { factLabel } from "@/lib/legal/intake/labels";
import {
  interpretLegalAnswer,
  saveLegalAnswer,
} from "@/lib/legal/intake/actions";
import {
  NONE_QUESTIONS,
  type IntakeQuestion,
  type ProposedFact,
} from "@/lib/legal/intake/types";

const fr = { auth, legal };

// The answer's field: focused when a question is opened from its row.
export const LEGAL_ANSWER_FIELD = "legal-answer";
const FIELD_ID = LEGAL_ANSWER_FIELD;
const NONE_FACT: ProposedFact = { kind: "none", value: {}, quote: null };

/**
 * The one question asked now (ticket Juridique 01: « une seule question
 * dominante »): its reason, a free answer (typed or dictated), what PO read
 * in it, then « Enregistrer ». Nothing is written before that. What the
 * Cadrage established, or the people already known on the title, comes as
 * the answer; « Aucun emprunt / accord… »
 * settles the question at once, without PO (UX test of 09/10/2026). Shown
 * as the Cadrage shows its questions (« Question de PO », PoQuestion and
 * PoReading, proto « Projet complet »).
 */
export function QuestionCard({
  projectId,
  question,
  position,
  total,
  nav,
  correcting,
  onCancel,
  onSaved,
}: {
  projectId: string;
  question: IntakeQuestion;
  // 1-based place of this question among those of the step.
  position: number;
  total: number;
  // The arrows to the question before and after (the step's page).
  nav?: PoQuestionNav;
  // An answered question: the previous answer comes back to edit.
  correcting: boolean;
  // « Annuler » (the Confirmation's dialog); none when arrows lead away.
  onCancel?: () => void;
  onSaved: () => void;
}) {
  const t = fr.legal.intake;
  const q = t.questions[question.key];
  const from = correcting ? null : question.suggestionFrom;
  // Some people are already known: ask only for the others.
  const known = from === "known" && question.key === "contributors";
  const ask = known ? t.questions.contributors.askKnown : q.ask;
  const why = known ? t.questions.contributors.whyKnown : q.why;
  const [text, setText] = useState(
    correcting ? (question.lastAnswer ?? "") : (question.suggestion ?? ""),
  );
  const noneLabel = NONE_QUESTIONS.includes(question.key)
    ? t.none[question.key]
    : null;
  const [review, setReview] = useState<{
    facts: ProposedFact[];
    dropped: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, startReading] = useTransition();
  const [saving, startSaving] = useTransition();
  const input = {
    projectId,
    questionKey: question.key,
    masterId: question.masterId,
    text,
  };

  const read = () =>
    startReading(async () => {
      setError(null);
      const result = await interpretLegalAnswer(input);
      if (result.ok)
        setReview({ facts: result.facts, dropped: result.dropped });
      else
        setError(
          result.error === "quota"
            ? result.message
            : result.error === "provider"
              ? t.errors.provider
              : fr.auth.errors.forbidden,
        );
    });

  // Nothing kept in what PO read: on a question « nothing » settles, the
  // answer is « nothing » rather than a dead end.
  const kept = review
    ? review.facts.length > 0
      ? review.facts
      : noneLabel
        ? [NONE_FACT]
        : []
    : [];
  const record = (answer: string, facts: ProposedFact[]) =>
    startSaving(async () => {
      setError(null);
      const result = await saveLegalAnswer({ ...input, text: answer, facts });
      if (!result.ok) return setError(result.error);
      onSaved();
    });
  const save = () => review && record(text, kept);
  const saveNone = () => noneLabel && record(noneLabel, [NONE_FACT]);

  return (
    <PoQuestion
      eyebrow={t.domains[question.key]}
      rank={{ position, total }}
      nav={nav}
      title={ask(question.title ?? "")}
      why={why}
    >
      {review ? (
        <PoReading
          items={review.facts.map((fact, index) => {
            const label = factLabel(fact, question.key);
            return { key: `${label}-${index}`, label, quote: fact.quote };
          })}
          dropped={review.dropped}
          empty={
            <ToneCallout tone="info">
              {noneLabel ? t.nothingFoundNone(noneLabel) : t.nothingFound}
            </ToneCallout>
          }
          onRemove={(index) =>
            setReview({
              ...review,
              facts: review.facts.filter((_, i) => i !== index),
            })
          }
        />
      ) : (
        <>
          {from && (
            <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
              {from === "known" ? t.fromKnown : t.fromCadrage}
            </p>
          )}
          <TextareaField
            id={FIELD_ID}
            name="answer"
            label={t.answerLabel}
            aria-required
            hint={q.hint}
            rows={4}
            maxLength={4000}
            value={text}
            onChange={(event) => setText(event.target.value)}
            addon={<VoiceFieldControl fieldId={FIELD_ID} />}
          />
        </>
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      {/* The main action first, on the left (C0). */}
      <div className="flex flex-wrap gap-2">
        {review ? (
          <>
            <Button
              type="button"
              disabled={saving || kept.length === 0}
              aria-busy={saving || undefined}
              onClick={save}
            >
              {saving
                ? t.saving
                : review.facts.length === 0 && noneLabel
                  ? `${t.save} : ${noneLabel.toLowerCase()}`
                  : t.save}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={saving}
              onClick={() => setReview(null)}
            >
              {t.editAnswer}
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              disabled={reading || saving || text.trim() === ""}
              aria-busy={reading || undefined}
              onClick={read}
            >
              {reading ? t.reading : t.read}
            </Button>
            {noneLabel && (
              <Button
                type="button"
                variant="outline"
                disabled={reading || saving}
                aria-busy={saving || undefined}
                onClick={saveNone}
              >
                {noneLabel}
              </Button>
            )}
            {correcting && onCancel && (
              <Button
                type="button"
                variant="ghost"
                disabled={reading}
                onClick={onCancel}
              >
                {t.cancel}
              </Button>
            )}
          </>
        )}
      </div>
    </PoQuestion>
  );
}
