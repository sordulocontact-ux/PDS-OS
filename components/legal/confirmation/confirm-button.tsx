"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { confirmLegalIntake } from "@/lib/legal/intake/actions";

/** « Confirmer le dossier »: the one decision of the step. The page then
 * shows who confirmed and when. */
export function ConfirmButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const t = fr.legal.confirmation;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
            if (result.ok) router.refresh();
            else setError(result.error);
          })
        }
      >
        {pending ? t.confirming : t.confirm}
      </Button>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </div>
  );
}
