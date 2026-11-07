"use client";

import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { useAfterAnswer } from "@/components/strategy/questions/use-after-answer";
import { Button } from "@/components/ui/button";
import { PoQuestion, type PoQuestionNav } from "@/components/ui/po-question";
import { strategyQuestions } from "@/lib/i18n/fr/strategy-questions";
import { arbitrateLever } from "@/lib/strategy/actions/add-line";
import type { StrategyQuestion } from "@/lib/strategy/questions";

const fr = { strategyQuestions };

const t = fr.strategyQuestions;

/**
 * A lever to arbitrate, asked by PO in « Les 8 dimensions »: where it comes
 * from, « Retenir » / « Ne pas retenir » (never retained beforehand), then
 * the next question — or, after the last one, the next step opens
 * (withOutcome).
 */
export function LeverQuestion({
  projectId,
  question,
  eyebrow,
  nav,
  afterHref,
}: {
  projectId: string;
  question: Extract<StrategyQuestion, { kind: "lever" }>;
  eyebrow: string;
  nav: PoQuestionNav;
  afterHref: string;
}) {
  const after = useAfterAnswer(afterHref);
  const [choice, setChoice] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const decide = (retain: boolean) =>
    start(async () => {
      setChoice(retain);
      setError(null);
      const result = await arbitrateLever(projectId, question.action, retain);
      if (!result.ok) return setError(result.error);
      after(result);
    });
  const busy = (retain: boolean) => (pending && choice === retain) || undefined;

  return (
    <PoQuestion
      eyebrow={eyebrow}
      nav={nav}
      title={t.lever(question.name)}
      why={t.leverWhy(question.source, question.quote)}
    >
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={pending}
          aria-busy={busy(true)}
          onClick={() => decide(true)}
        >
          {t.retain}
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          aria-busy={busy(false)}
          onClick={() => decide(false)}
        >
          {t.notRetain}
        </Button>
      </div>
    </PoQuestion>
  );
}
