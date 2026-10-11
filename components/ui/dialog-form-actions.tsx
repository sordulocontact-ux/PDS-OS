"use client";

import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";

/** « Annuler » then the main button, at the bottom of a dialog form. */
export function DialogFormActions({
  pending,
  submitLabel,
  onCancel,
}: {
  pending: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  const t = fr.dialogs;
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
        {t.cancel}
      </Button>
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        aria-busy={pending || undefined}
      >
        {pending ? t.saving : submitLabel}
      </Button>
    </div>
  );
}
