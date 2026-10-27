"use client";

import { Button } from "@/components/ui/button";
import { dialogs } from "@/lib/i18n/fr/dialogs";

const fr = { dialogs };

/** The main button first, on the left, then « Annuler » (docs/DESIGN.md
 * § 4, « Modale », C0 of 18/10/2026): the one place a dialog form lays out
 * its buttons. */
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
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        aria-busy={pending || undefined}
      >
        {pending ? t.saving : submitLabel}
      </Button>
      <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
        {t.cancel}
      </Button>
    </div>
  );
}
