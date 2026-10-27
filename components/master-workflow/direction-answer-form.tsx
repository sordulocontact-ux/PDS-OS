"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { fr } from "@/lib/i18n/fr";
import {
  readDirectionAnswer,
  type ReadItem,
} from "@/lib/master-workflow/answer-reading";
import { answerBriefQuestion } from "@/lib/master-workflow/question-actions";

const t = fr.masterAnswer;
const GROUPS = ["direction", "references", "constraints"] as const;

/**
 * The creative director answers the direction question (proto
 * `daQuestion`): « Lire ma réponse », then « Ce que PO a compris », each
 * item with the words it comes from (kept only when found word for word,
 * by the code); she removes what is wrong, then « Envoyer la réponse ».
 * Nothing is saved before.
 */
export function DirectionAnswerForm({
  projectId,
  questionId,
}: {
  projectId: string;
  questionId: string;
}) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<ReadItem[] | null>(null);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const read = () => {
    setTried(true);
    if (!text.trim()) return;
    setError(null);
    start(async () => {
      const result = await readDirectionAnswer(text);
      if (!result.ok) return setError(result.error);
      setItems(result.items);
    });
  };
  const send = () =>
    start(async () => {
      setError(null);
      const result = await answerBriefQuestion(
        projectId,
        questionId,
        text,
        null,
        items ?? [],
      );
      if (!result.ok) return setError(result.error);
      toast.success(fr.masterWorkflow.questions.answered);
    });

  if (items === null)
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
          {t.intro}
        </p>
        <TextareaField
          name={`answer-${questionId}`}
          label={t.label}
          aria-required
          rows={4}
          maxLength={2000}
          placeholder={t.placeholder}
          value={text}
          error={
            tried && !text.trim()
              ? fr.masterWorkflow.questions.errors.empty
              : undefined
          }
          onChange={(e) => setText(e.target.value)}
        />
        {error && <FormMessage kind="error">{error}</FormMessage>}
        <Button
          className="self-start"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={read}
        >
          {pending ? t.reading : t.read}
        </Button>
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold">{t.understood}</span>
        <span className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
          {t.understoodHint}
        </span>
      </div>
      {items.length === 0 && (
        <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
          {t.nothing}
        </p>
      )}
      {GROUPS.filter((g) => items.some((i) => i.group === g)).map((g) => (
        <div key={g} className="flex flex-col gap-1.5">
          <span className="text-[length:var(--type-caption)] font-semibold text-[color:var(--text-secondary)]">
            {t.groups[g]}
          </span>
          <FactRows>
            {items
              .filter((i) => i.group === g)
              .map((i) => (
                <FactRow
                  key={`${i.group}-${i.label}`}
                  value={<b className="font-semibold">{i.label}</b>}
                  source={`« ${i.quote} »`}
                  side={
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={t.removeLabel(i.label)}
                      onClick={() => setItems(items.filter((x) => x !== i))}
                    >
                      {t.remove}
                    </Button>
                  }
                />
              ))}
          </FactRows>
        </div>
      ))}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={send}>
          {t.send}
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => setItems(null)}
        >
          {t.back}
        </Button>
      </div>
    </div>
  );
}
