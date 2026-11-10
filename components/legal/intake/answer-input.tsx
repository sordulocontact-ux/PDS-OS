"use client";

import { TextareaField } from "@/components/auth/textarea-field";
import { YesNoChoice, type YesNo } from "@/components/ui/yes-no-choice";
import { VoiceFieldControl } from "@/components/voice/voice-field-control";
import { legal } from "@/lib/i18n/fr/legal";

const fr = { legal };

// The answer's field: focused when a question is opened from its row.
export const LEGAL_ANSWER_FIELD = "legal-answer";

/**
 * What a Cadrage juridique question is answered with, before PO reads it:
 * « Oui… / Non… » first when « none » can settle it (`yesNo`), then the free
 * answer (typed or dictated) once « Oui » is chosen, or at once on a
 * question that is not yes-or-no. One grey line at most: where the answer
 * comes from when it was offered (JUR-05), else what to write.
 */
export function AnswerInput({
  name,
  yesNo,
  choice,
  onChoice,
  label,
  hint,
  noFromCadrage,
  text,
  onText,
  disabled,
}: {
  name: string;
  yesNo?: { yes: string; no: string };
  choice: YesNo | null;
  onChoice: (choice: YesNo) => void;
  label: string;
  hint: string;
  // « Non » offered because the Cadrage settled it: said under the choice.
  noFromCadrage: boolean;
  text: string;
  onText: (text: string) => void;
  disabled: boolean;
}) {
  const t = fr.legal.intake;
  return (
    <>
      {yesNo && (
        <YesNoChoice
          name={`legal-yes-no-${name}`}
          legend={t.yesNoLegend}
          labels={yesNo}
          value={choice}
          onChange={onChoice}
          disabled={disabled}
        />
      )}
      {choice === "no" && noFromCadrage && (
        <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
          {t.fromCadrage}
        </p>
      )}
      {(!yesNo || choice === "yes") && (
        <TextareaField
          id={LEGAL_ANSWER_FIELD}
          name="answer"
          label={label}
          aria-required
          hint={hint}
          rows={4}
          maxLength={4000}
          value={text}
          onChange={(event) => onText(event.target.value)}
          addon={<VoiceFieldControl fieldId={LEGAL_ANSWER_FIELD} />}
        />
      )}
    </>
  );
}
