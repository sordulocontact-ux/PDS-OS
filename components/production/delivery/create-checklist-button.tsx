"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { createExportChecklist } from "@/lib/production/delivery/checklist-actions";

const t = fr.productionDelivery;

/** « Créer la checklist »: the lines proposed from the Fiche Livrable,
 * created by the person who clicks. */
export function CreateChecklistButton({
  projectId,
  sheetId,
}: {
  projectId: string;
  sheetId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        size="sm"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await createExportChecklist({ projectId, sheetId });
            if (result.ok) toast.success(t.checklist.created);
            else setError(result.error);
          })
        }
      >
        {pending ? t.saving : t.checklist.create}
      </Button>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </div>
  );
}
