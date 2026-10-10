"use client";

import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";

/**
 * Buttons of a prepared exchange (Stratégie, Conception): « Annuler » and
 * « Vérifier » while editing; on the summary, « Modifier » and « Créer
 * l'échange », the only one that submits.
 */
export function CallFormActions({
  onSummary,
  onCancel,
  onReview,
  onEdit,
}: {
  onSummary: boolean;
  onCancel: () => void;
  onReview: () => void;
  onEdit: () => void;
}) {
  const t = fr.strategyEntry.call;
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {onSummary ? (
        <>
          <Button type="button" variant="ghost" size="lg" onClick={onEdit}>
            {t.edit}
          </Button>
          <SubmitButton pendingLabel={t.creating}>{t.create}</SubmitButton>
        </>
      ) : (
        <>
          <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
            {t.cancel}
          </Button>
          <Button type="button" size="lg" onClick={onReview}>
            {t.review}
          </Button>
        </>
      )}
    </div>
  );
}
