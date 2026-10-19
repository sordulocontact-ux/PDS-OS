"use client";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import { recordBrief } from "@/lib/master-workflow/brief-fact-actions";

const t = fr.masterBrief;

/** « Enregistrer le Brief »: never disabled; what is missing is said. */
export function BriefRecord({ projectId }: { projectId: string }) {
  const submit = useWriteSubmit(() => undefined, t.recorded);
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
        {submit.pending ? t.recording : t.record}
      </Button>
    </div>
  );
}
