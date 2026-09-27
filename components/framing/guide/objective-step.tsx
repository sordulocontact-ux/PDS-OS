"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { GuideRow } from "@/components/framing/guide/guide-row";
import { FramingStepCard } from "@/components/framing/guide/step-card";
import { SourceQuote } from "@/components/framing/guide/source-quote";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { confirmField, saveField } from "@/lib/framing/actions/brief";
import {
  chooseObjective,
  proposeObjectiveChoices,
} from "@/lib/framing/actions/objective";
import type { BriefFieldState } from "@/lib/framing/brief";
import type { ObjectiveSuggestion } from "@/lib/framing/suggest-objective";
import { fr } from "@/lib/i18n/fr";

type Choice =
  | { kind: "current" }
  | { kind: "suggestion"; text: string }
  | { kind: "other" };

/** "Qu'est-ce qui compte le plus ?": pick a formulation, or write another. */
export function ObjectiveStep({
  field,
  suggestions,
  projectId,
  editable,
  nextHref,
}: {
  field: BriefFieldState;
  suggestions: ObjectiveSuggestion[];
  projectId: string;
  editable: boolean;
  nextHref: string;
}) {
  const t = fr.framingGuide.objective;
  const router = useRouter();
  const { pending, run } = useFramingAction();
  const [suggesting, startSuggesting] = useTransition();
  const [choice, setChoice] = useState<Choice | null>(
    field.value ? { kind: "current" } : null,
  );
  const [draft, setDraft] = useState("");
  const busy = pending || suggesting;
  const others = suggestions.filter((s) => s.text !== field.value);
  const is = (c: Choice) =>
    choice?.kind === c.kind &&
    (c.kind !== "suggestion" ||
      (choice.kind === "suggestion" && choice.text === c.text));

  function confirm() {
    const next = () => router.push(nextHref);
    if (!choice) return;
    if (choice.kind === "current") {
      if (field.status === "proposed")
        run(() => confirmField(projectId, "brief", "objective"), next);
      else next();
    } else if (choice.kind === "suggestion") {
      run(() => chooseObjective(projectId, choice.text), next);
    } else {
      run(() => saveField(projectId, "brief", "objective", draft), next);
    }
  }

  function suggest() {
    startSuggesting(async () => {
      const result = await proposeObjectiveChoices(projectId);
      if (!result.ok) toast.error(t.suggestErrors[result.error]);
      else if (result.count === 0) toast(t.noneFound);
    });
  }

  return (
    <FramingStepCard
      eyebrow={field.status === "proposed" ? t.eyebrowProposed : t.eyebrow}
      title={t.title}
      description={
        field.provenance ? <SourceQuote provenance={field.provenance} /> : null
      }
      actions={
        editable && (
          <>
            <Button
              size="lg"
              disabled={
                busy ||
                !choice ||
                (choice.kind === "other" && draft.trim() === "")
              }
              onClick={confirm}
            >
              {t.confirm}
            </Button>
            <Button
              size="lg"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setDraft(field.value ?? "");
                setChoice({ kind: "other" });
              }}
            >
              {t.edit}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              disabled={busy}
              onClick={suggest}
              title={t.suggestHint}
            >
              {t.suggest}
            </Button>
          </>
        )
      }
    >
      <div
        role="radiogroup"
        aria-label={t.title}
        className="flex flex-col gap-1"
      >
        {field.value && (
          <GuideRow
            selected={is({ kind: "current" })}
            onSelect={() => setChoice({ kind: "current" })}
            disabled={!editable || busy}
            detail={field.provenance?.kind === "call" ? t.fromCall : undefined}
          >
            {field.value}
          </GuideRow>
        )}
        {others.map((s) => (
          <GuideRow
            key={s.text}
            selected={is({ kind: "suggestion", text: s.text })}
            onSelect={() => setChoice({ kind: "suggestion", text: s.text })}
            disabled={!editable || busy}
            detail={`${s.sourceLabel} · « ${s.quote} »`}
          >
            {s.text}
          </GuideRow>
        ))}
        {editable && (
          <GuideRow
            selected={is({ kind: "other" })}
            onSelect={() => setChoice({ kind: "other" })}
            disabled={busy}
          >
            {t.other}
          </GuideRow>
        )}
      </div>

      {choice?.kind === "other" && editable && (
        <div className="grid gap-2">
          <Label htmlFor="objective-other">{t.otherLabel}</Label>
          <Textarea
            id="objective-other"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            autoFocus
          />
        </div>
      )}
    </FramingStepCard>
  );
}
