"use client";

import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { usePublishResult } from "@/components/shell/module/result-banner";
import { Button } from "@/components/ui/button";
import { legal } from "@/lib/i18n/fr/legal";
import { confirmLegalIntake } from "@/lib/legal/intake/actions";

const fr = { legal };

/** « Confirmer et générer le plan d'action »: the one decision of the step,
 * first of its row (`children`: « Corriger une réponse »). The page then
 * shows who confirmed and when, and the result banner what follows. */
export function ConfirmButton({
  projectId,
  label,
  children,
}: {
  projectId: string;
  label: string;
  children?: React.ReactNode;
}) {
  const t = fr.legal.confirmation;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const publish = usePublishResult();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
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
          {pending ? t.confirming : label}
        </Button>
        {children}
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </div>
  );
}
