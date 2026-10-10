"use client";

import { useState } from "react";

import { FieldError, FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { fr } from "@/lib/i18n/fr";
import { decidePostVersion } from "@/lib/production/post/review-actions";
import {
  VERSION_DECISIONS,
  type VersionDecision,
} from "@/lib/production/post/rules";

import { usePostSubmit } from "./use-post-submit";

const t = fr.productionPost.decision;

/** « Valider », « Demander des corrections » or « Refuser » a version in
 * final validation; a reason is required for the last two. */
export function DecisionForm({
  projectId,
  versionId,
}: {
  projectId: string;
  versionId: string;
}) {
  const [decision, setDecision] = useState<VersionDecision | null>(null);
  const [missing, setMissing] = useState<"choice" | "note" | null>(null);
  const { pending, error, run } = usePostSubmit(() => {
    setDecision(null);
    setMissing(null);
  }, t.done);
  const id = `decision-${versionId}`;

  function submit(form: HTMLFormElement) {
    const note = String(new FormData(form).get("note") ?? "");
    const lack = !decision
      ? "choice"
      : decision !== "approve" && note.trim() === ""
        ? "note"
        : null;
    setMissing(lack);
    if (!decision || lack) {
      form
        .querySelector<HTMLElement>(
          lack === "note" ? "[aria-invalid=true]" : "input[type=radio]",
        )
        ?.focus();
      return;
    }
    run(() => decidePostVersion({ projectId, versionId, decision, note }));
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget);
      }}
    >
      <div className="flex flex-col gap-1.5">
        <ChoiceCards
          name={`${id}-choice`}
          legend={t.legend}
          required
          columns={3}
          value={decision}
          onChange={(next) => {
            setDecision(next);
            setMissing(null);
          }}
          choices={VERSION_DECISIONS.map((d) => ({
            value: d,
            label: t.choices[d].label,
            hint: t.choices[d].hint,
          }))}
        />
        {missing === "choice" && (
          <FieldError id={`${id}-choice-error`}>{t.choiceMissing}</FieldError>
        )}
      </div>
      <TextareaField
        id={`${id}-note`}
        name="note"
        label={t.note}
        hint={t.noteHint}
        rows={3}
        maxLength={2000}
        aria-required={
          (decision !== null && decision !== "approve") || undefined
        }
        error={missing === "note" ? t.noteMissing : undefined}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <div className="flex justify-end">
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {pending ? fr.productionPost.saving : t.submit}
        </Button>
      </div>
    </form>
  );
}
