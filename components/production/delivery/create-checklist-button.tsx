"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { productionDelivery } from "@/lib/i18n/fr/production-delivery";
import { createExportChecklist } from "@/lib/production/delivery/checklist-actions";

const fr = { productionDelivery };

const t = fr.productionDelivery;

/** « Créer la checklist » or « Ajouter ces fichiers »: the lines proposed
 * from the Fiche Livrable, created by the person who clicks; those already
 * there are never doubled (PROD-035). */
export function CreateChecklistButton({
  projectId,
  sheetId,
  label = t.checklist.create,
  done = t.checklist.created,
}: {
  projectId: string;
  sheetId: string;
  label?: string;
  done?: string;
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
            if (result.ok) toast.success(done);
            else setError(result.error);
          })
        }
      >
        {pending ? t.saving : label}
      </Button>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </div>
  );
}
