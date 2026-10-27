"use client";

import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { usePublishResult } from "@/components/shell/module/result-banner";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { confirmLegalIntake } from "@/lib/legal/intake/actions";

/** « Confirmer le dossier »: the one decision of the step. The page then
 * shows who confirmed and when, and the result banner what follows. */
export function ConfirmButton({ projectId }: { projectId: string }) {
  const t = fr.legal.confirmation;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const publish = usePublishResult();

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        size="lg"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await confirmLegalIntake(projectId);
            if (!result.ok) return setError(result.error);
            // The banner in the step and the toast (rule 7).
            publish(result);
          })
        }
      >
        {pending ? t.confirming : t.confirm}
      </Button>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </div>
  );
}
