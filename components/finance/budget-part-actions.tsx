"use client";

import { IconPlus } from "nucleo-sharp-essential";

import { PartForm } from "@/components/finance/budget-part-forms";
import { DialogButton } from "@/components/ui/dialog-button";
import type { EnvelopeKind } from "@/lib/finance/envelopes";
import { financeBudgets } from "@/lib/i18n/fr/finance-budgets";

const fr = { financeBudgets };

/** « Ajouter un sous-budget » beside the sub-budgets' title, or « Découper
 * ce budget » in their empty note (`first`): the same form. */
export function AddPartButton({
  kind,
  targetId,
  first = false,
}: {
  kind: EnvelopeKind;
  targetId: string;
  first?: boolean;
}) {
  const t = fr.financeBudgets;
  return (
    <DialogButton
      label={first ? t.parts.cut : t.actions.addPart}
      icon={IconPlus}
      title={t.partForm.addTitle}
      description=""
    >
      {(close) => (
        <PartForm kind={kind} targetId={targetId} part={null} onDone={close} />
      )}
    </DialogButton>
  );
}
