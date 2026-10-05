"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { ProposalReview } from "@/components/legal/intake/proposal-review";
import { PageSection } from "@/components/shell/page-section";
import { Button } from "@/components/ui/button";
import { VoiceFieldControl } from "@/components/voice/voice-field-control";
import { fr } from "@/lib/i18n/fr";
import {
  interpretLegalAnswer,
  saveLegalAnswer,
} from "@/lib/legal/intake/actions";
import type { IntakeQuestion, ProposedFact } from "@/lib/legal/intake/types";

const FIELD_ID = "legal-answer";

/**
 * The one question asked now (ticket Juridique 01: « une seule question
 * dominante »): its reason, a free answer (typed or dictated), what PO read
 * in it, then « Enregistrer ». Nothing is written before that.
 */
export function QuestionCard({
  projectId,
  question,
  correcting,
  onCancel,
  onSaved,
}: {
  projectId: string;
  question: IntakeQuestion;
  // Opened from « Corriger »: the previous answer comes back to edit.
  correcting: boolean;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const t = fr.legal.intake;
  const q = t.questions[question.key];
  const [text, setText] = useState(
    correcting ? (question.lastAnswer ?? "") : "",
  );
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
          result.error === "provider"
            ? t.errors.provider
            : fr.auth.errors.forbidden,
        );
    });

  const save = () =>
    startSaving(async () => {
      if (!review) return;
      setError(null);
      const result = await saveLegalAnswer({ ...input, facts: review.facts });
      if (!result.ok) return setError(result.error);
      onSaved();
      router.refresh();
    });

  return (
    <PageSection
      card
      id="legal-question"
      title={q.ask(question.title ?? "")}
      description={q.why}
    >
      {review ? (
        <ProposalReview
          question={question.key}
          facts={review.facts}
          dropped={review.dropped}
          onRemove={(index) =>
            setReview({
              ...review,
              facts: review.facts.filter((_, i) => i !== index),
            })
          }
        />
      ) : (
        <TextareaField
          id={FIELD_ID}
          name="answer"
          label={t.answerLabel}
          hint={q.hint}
          rows={4}
          maxLength={4000}
          value={text}
          onChange={(event) => setText(event.target.value)}
          addon={<VoiceFieldControl fieldId={FIELD_ID} />}
        />
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {review ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              disabled={saving}
              onClick={() => setReview(null)}
            >
              {t.editAnswer}
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={saving || review.facts.length === 0}
              aria-busy={saving || undefined}
              onClick={save}
            >
              {saving ? t.saving : t.save}
            </Button>
          </>
        ) : (
          <>
            {correcting && (
              <Button
                type="button"
                variant="ghost"
                size="lg"
                disabled={reading}
                onClick={onCancel}
              >
                {t.cancel}
              </Button>
            )}
            <Button
              type="button"
              size="lg"
              disabled={reading || text.trim() === ""}
              aria-busy={reading || undefined}
              onClick={read}
            >
              {reading ? t.reading : t.read}
            </Button>
          </>
        )}
      </div>
    </PageSection>
  );
}
