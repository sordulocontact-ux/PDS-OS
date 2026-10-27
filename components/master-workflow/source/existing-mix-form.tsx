"use client";

import { useState } from "react";

import { FieldError, FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { masterSource } from "@/lib/i18n/fr/master-source";
import { declareExistingMix } from "@/lib/master-workflow/source-actions";

const fr = { masterSource };

const t = fr.masterSource;

/**
 * A mix found in the Catalogue (proto `master:mixdone`): use it as the Mix
 * final, saying why (rule 6), or mix again — then the source form below
 * applies (`onRedo`).
 */
export function ExistingMixForm({
  projectId,
  masterId,
  fileId,
  onRedo,
}: {
  projectId: string;
  masterId: string;
  fileId: string;
  onRedo: (redo: boolean) => void;
}) {
  const [choice, setChoice] = useState<"use" | "redo" | null>(null);
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  const submit = useWriteSubmit(() => undefined, t.existing.done);
  const reasonError = !reason.trim() ? t.errors.reason : undefined;
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (choice !== "use" || reasonError) return;
        submit.run(() =>
          declareExistingMix({ projectId, masterId, fileId, reason }),
        );
      }}
    >
      <div className="flex flex-col gap-1.5">
        <ChoiceCards
          name={`existing-${masterId}`}
          legend={t.existing.legend}
          required
          value={choice}
          onChange={(value) => {
            setChoice(value);
            onRedo(value === "redo");
          }}
          choices={[
            { value: "use", label: t.existing.use, hint: t.existing.useHint },
            {
              value: "redo",
              label: t.existing.redo,
              hint: t.existing.redoHint,
            },
          ]}
        />
        {tried && !choice && (
          <FieldError id="existing-choice-error">{t.errors.choice}</FieldError>
        )}
      </div>
      {choice === "use" && (
        <>
          <TextareaField
            name={`reason-${masterId}`}
            label={t.existing.reason}
            required
            rows={3}
            maxLength={2000}
            value={reason}
            error={tried ? reasonError : undefined}
            onChange={(e) => setReason(e.target.value)}
          />
          <FormMessage kind="error">{submit.error}</FormMessage>
          <Button
            type="submit"
            className="self-start"
            disabled={submit.pending}
            aria-busy={submit.pending || undefined}
          >
            {t.existing.submit}
          </Button>
        </>
      )}
    </form>
  );
}
