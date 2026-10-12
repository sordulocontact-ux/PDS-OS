"use client";

import { ConfirmButton } from "@/components/ui/confirm-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { validateMasterSplit } from "@/lib/catalog/master/rights-actions";
import type { SplitKind } from "@/lib/catalog/master/rules";
import type { SplitReviewState } from "@/lib/catalog/master/split-review";
import { fr } from "@/lib/i18n/fr";
import { splitReviewTone } from "@/lib/ui/state-tones";

/**
 * Next to « Complet » / « Reste x % », the validation of a split (retours
 * Catalogue 44, 46, 48), and « Valider la répartition » for the legal side
 * once it is at 100 % and not already the validated version.
 */
export function SplitReviewBar({
  masterId,
  kind,
  state,
  complete,
  canValidate,
}: {
  masterId: string;
  kind: SplitKind;
  state: SplitReviewState;
  complete: boolean;
  canValidate: boolean;
}) {
  const t = fr.masterPage.splits.review;
  return (
    <>
      <StatusBadge tone={splitReviewTone[state]}>{t.states[state]}</StatusBadge>
      {canValidate && complete && state !== "validated" && (
        <ConfirmButton
          label={t.validate}
          title={t.validateTitle(fr.masterPage.splits.kinds[kind])}
          body={t.validateBody}
          confirmLabel={t.validate}
          pendingLabel={fr.dialogs.saving}
          done={t.validated}
          run={() => validateMasterSplit(masterId, kind)}
        />
      )}
    </>
  );
}
