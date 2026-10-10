"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { deletePostStep } from "@/lib/production/post/step-actions";
import type { PostStepKey } from "@/lib/production/post/rules";
import type { StepSuggestion } from "@/lib/production/post/suggestions";
import type {
  PostPeople,
  PostScope,
  PostStep,
} from "@/lib/production/post/types";

import { PostRowMenu } from "./post-row-menu";
import { StepDialog } from "./step-dialog";

const t = fr.productionPost.steps;

/** « Ajouter une étape »: any step, « Autre étape » to name one. */
export function StepAddButton({
  scope,
  people,
}: {
  scope: PostScope;
  people: PostPeople;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <IconPlus aria-hidden data-icon="inline-start" />
        {t.add}
      </Button>
      <StepDialog
        scope={scope}
        people={people}
        open={open}
        step={null}
        initialKey="other"
        onClose={() => setOpen(false)}
      />
    </>
  );
}

/** PO's suggestions, with why each is suggested: « Ajouter » opens the form
 * on that step, nobody chosen. Nothing is created before it is saved. */
export function StepSuggestions({
  scope,
  people,
  suggestions,
}: {
  scope: PostScope;
  people: PostPeople;
  suggestions: StepSuggestion[];
}) {
  const [key, setKey] = useState<PostStepKey | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-medium">{t.suggestionsTitle}</h3>
        <p className="text-sm text-muted-foreground">{t.suggestionsHint}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {suggestions.map((s) => (
          <li key={s.key} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col">
              <span>{t.keys[s.key]}</span>
              <span className="text-sm text-muted-foreground">
                {t.because[s.because]}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              aria-label={t.addSuggestion(t.keys[s.key])}
              onClick={() => setKey(s.key)}
            >
              <IconPlus aria-hidden data-icon="inline-start" />
              {t.addShort}
            </Button>
          </li>
        ))}
      </ul>
      <StepDialog
        scope={scope}
        people={people}
        open={key !== null}
        step={null}
        initialKey={key ?? "other"}
        onClose={() => setKey(null)}
      />
    </div>
  );
}

/** « ⋯ » of a step: « Modifier » in the dialog, « Supprimer » confirmed. */
export function StepMenu({
  scope,
  people,
  step,
  label,
}: {
  scope: PostScope;
  people: PostPeople;
  step: PostStep;
  label: string;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <>
      <PostRowMenu
        label={t.menu(label)}
        onEdit={() => setEditing(true)}
        remove={{
          title: t.removeTitle,
          body: t.removeBody(label),
          done: t.removed,
          action: () =>
            deletePostStep({ projectId: scope.projectId, stepId: step.id }),
        }}
      />
      <StepDialog
        scope={scope}
        people={people}
        open={editing}
        step={step}
        initialKey={step.key}
        onClose={() => setEditing(false)}
      />
    </>
  );
}
