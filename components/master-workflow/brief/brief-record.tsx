"use client";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { masterBrief } from "@/lib/i18n/fr/master-brief";
import { recordBrief } from "@/lib/master-workflow/brief-fact-actions";

const fr = { masterBrief };

const t = fr.masterBrief;

/**
 * « Enregistrer le Brief »: never disabled; what is missing is said. Once
 * recorded, the button only comes back when a fact has changed since —
 * otherwise the Brief says it is done and how to change it.
 */
export function BriefRecord({
  projectId,
  recorded,
  dirty,
}: {
  projectId: string;
  recorded: boolean;
  dirty: boolean;
}) {
  const submit = useWriteSubmit(() => undefined, t.recorded);
  if (recorded && !dirty)
    return (
      <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
        {t.upToDate}
      </p>
    );
  return (
    <div className="flex flex-col gap-2">
      <FormMessage kind="error">{submit.error}</FormMessage>
      <Button
        type="button"
        className="self-start"
        disabled={submit.pending}
        aria-busy={submit.pending || undefined}
        onClick={() => submit.run(() => recordBrief(projectId))}
      >
        {submit.pending ? t.recording : recorded ? t.recordChanges : t.record}
      </Button>
    </div>
  );
}
