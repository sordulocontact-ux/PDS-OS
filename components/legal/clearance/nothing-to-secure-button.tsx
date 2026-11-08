"use client";

import { DialogButton } from "@/components/ui/dialog-button";
import { ReasonForm } from "@/components/ui/reason-form";
import { legalClearance } from "@/lib/i18n/fr/legal-clearance";
import { declareNothingToSecure } from "@/lib/legal/clearance/flow-actions";
import type { Clearance } from "@/lib/legal/clearance/types";

import { usageOf } from "./usage";

const fr = { legalClearance };

/** « Autre issue : Rien à sécuriser » — before asking, the block lifted
 * with its reason (a work in the public domain…), kept in the journal. */
export function NothingToSecureButton({
  projectId,
  clearance,
}: {
  projectId: string;
  clearance: Clearance;
}) {
  const t = fr.legalClearance.flow;
  return (
    <DialogButton
      label={t.nothing}
      variant="outline"
      size="xs"
      title={t.nothing}
      description={t.nothingBody}
    >
      {(close) => (
        <ReasonForm
          label={t.reasonLabel}
          submitLabel={t.nothing}
          doneMessage={t.nothingDone}
          run={(reason) =>
            declareNothingToSecure({
              projectId,
              clearanceId: clearance.id,
              usage: usageOf(clearance),
              reason,
            })
          }
          onDone={close}
        />
      )}
    </DialogButton>
  );
}
