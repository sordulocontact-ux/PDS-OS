"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { GuideRow } from "@/components/framing/guide/guide-row";
import { SourceDetail } from "@/components/framing/guide/source-quote";
import { FramingStepCard } from "@/components/framing/guide/step-card";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
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
      title={t.title}
      actions={
        editable && (
          <>
            <Button
              size="lg"
              variant="ghost"
              disabled={busy}
              onClick={suggest}
              title={t.suggestHint}
            >
              {t.suggest}
            </Button>
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
          </>
        )
      }
    >
      <div
        role="radiogroup"
        aria-label={t.title}
        className="flex flex-col gap-3"
      >
        {field.value && (
          <GuideRow
            selected={is({ kind: "current" })}
            onSelect={() => setChoice({ kind: "current" })}
            disabled={!editable || busy}
            detail={
              <SourceDetail
                provenance={field.provenance}
                proposed={field.status === "proposed"}
              />
            }
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
            onSelect={() => {
              // Starts from the current wording: rewriting it is the usual case.
              if (!draft) setDraft(field.value ?? "");
              setChoice({ kind: "other" });
            }}
            disabled={busy}
          >
            {t.other}
          </GuideRow>
        )}
      </div>
      {choice?.kind === "other" && editable && (
        <Textarea
          aria-label={t.otherLabel}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          autoFocus
          className="-mt-5"
        />
      )}
    </FramingStepCard>
  );
}
