"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { ProvenanceNote } from "@/components/framing/provenance-note";
import { useAfterAnswer } from "@/components/strategy/questions/use-after-answer";
import { Button } from "@/components/ui/button";
import { PoQuestion, type PoQuestionNav } from "@/components/ui/po-question";
import { toast } from "@/components/ui/toast";
import { VoiceFieldControl } from "@/components/voice/voice-field-control";
import {
  confirmField,
  rejectField,
  saveField,
} from "@/lib/framing/actions/brief";
import type { ActionResult } from "@/lib/framing/result";
import { framing } from "@/lib/i18n/fr/framing";
import { strategyQuestions } from "@/lib/i18n/fr/strategy-questions";
import { prepareStrategyDraft } from "@/lib/strategy/actions/draft";
import type { StrategyQuestion } from "@/lib/strategy/questions";

const fr = { framing, strategyQuestions };

const t = fr.strategyQuestions;

const FIELD_ID = "strategy-answer";

/**
 * A written point of the Stratégie asked by PO, one at a time: missing, a
 * free answer (typed or dictated) and « M'aider à définir » — PO drafts it
 * from the Brief and the calls, and the same question comes back with his
 * proposal —; proposed, PO's words with their source, « Confirmer »,
 * « Modifier » (the field, prefilled), « Écarter ». After an answer, the
 * next question.
 */
export function TextQuestion({
  projectId,
  question,
  eyebrow,
  nav,
  selfHref,
  afterHref,
}: {
  projectId: string;
  question: Extract<StrategyQuestion, { kind: "text" }>;
  // The dimension's name.
  eyebrow: string;
  nav: PoQuestionNav;
  // This question's URL: PO's proposal comes back on it.
  selfHref: string;
  afterHref: string;
}) {
  const router = useRouter();
  const after = useAfterAnswer(afterHref);
  const [editing, setEditing] = useState(!question.proposed);
  const [text, setText] = useState(question.value ?? "");
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [pending, start] = useTransition();
  const [helping, startHelp] = useTransition();
  const label = t.labels[question.key];
  const missing = tried && text.trim() === "";

  const run = (write: () => Promise<ActionResult>, done: string) =>
    start(async () => {
      setError(null);
      const result = await write();
      if (!result.ok) return setError(fr.framing.errors[result.error]);
      after({ ok: true, done });
    });
  const save = () => {
    setTried(true);
    if (text.trim() === "") return;
    run(
      () => saveField(projectId, "strategy", question.key, text),
      t.answered(label),
    );
  };
  const help = () =>
    startHelp(async () => {
      setError(null);
      const result = await prepareStrategyDraft(projectId, question.key);
      if (!result.ok) {
        if (result.error === "no_sources") toast(t.helpNoSources);
        else if (result.error === "quota") setError(result.message);
        else setError(t.helpFailed);
        return;
      }
      if (result.created === 0) {
        toast(t.helpNone);
        return;
      }
      router.replace(selfHref);
    });
  const discard = () =>
    start(async () => {
      setError(null);
      const result = await rejectField(projectId, "strategy", question.key);
      if (!result.ok) return setError(fr.framing.errors[result.error]);
      setText("");
      setEditing(true);
      router.refresh();
    });

  return (
    <PoQuestion
      eyebrow={eyebrow}
      nav={nav}
      title={t.ask[question.key]}
      why={question.proposed ? t.whyProposed : t.why}
    >
      {question.proposed && !editing ? (
        <div className="flex flex-col gap-1 rounded-lg bg-[var(--surface-soft)] px-3.5 py-3">
          <span className="text-caption text-[color:var(--text-secondary)]">
            {t.proposal}
          </span>
          <p className="font-semibold break-words">{question.value}</p>
          <ProvenanceNote provenance={question.provenance} />
        </div>
      ) : (
        <TextareaField
          id={FIELD_ID}
          name="answer"
          label={t.answerLabel}
          required
          rows={4}
          maxLength={2000}
          value={text}
          error={missing ? t.required : undefined}
          onChange={(event) => setText(event.target.value)}
          addon={<VoiceFieldControl fieldId={FIELD_ID} />}
        />
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      {/* The main action first, on the left (C0). */}
      <div className="flex flex-wrap gap-2">
        {question.proposed && !editing ? (
          <>
            <Button
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={() =>
                run(
                  () => confirmField(projectId, "strategy", question.key),
                  t.confirmed(label),
                )
              }
            >
              {t.confirm}
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setEditing(true)}
            >
              {t.edit}
            </Button>
            <Button variant="ghost" disabled={pending} onClick={discard}>
              {t.discard}
            </Button>
          </>
        ) : (
          <>
            <Button
              disabled={pending || helping}
              aria-busy={pending || undefined}
              onClick={save}
            >
              {pending ? t.saving : t.save}
            </Button>
            {question.canHelp && !question.proposed && (
              <Button
                variant="outline"
                disabled={pending || helping}
                aria-busy={helping || undefined}
                onClick={help}
              >
                {helping ? t.helping : t.help}
              </Button>
            )}
            {question.proposed && (
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  setText(question.value ?? "");
                  setEditing(false);
                }}
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
