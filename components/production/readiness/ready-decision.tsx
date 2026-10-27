"use client";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { ReasonForm } from "@/components/ui/reason-form";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { productionReady } from "@/lib/i18n/fr/production-ready";
import { decideReady } from "@/lib/production/ready-actions";

const fr = { productionReady };

const t = fr.productionReady;

/** « Valider la dérogation » or « Refuser » with its reason (recette 23/10,
 * MKT-PROD-002): the direction's decision on a preparation asked despite
 * critical lines. */
export function ReadyDecision({
  projectId,
  deliverableId,
}: {
  projectId: string;
  deliverableId: string;
}) {
  const { pending, error, run } = useWriteSubmit(() => undefined, t.approved);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={() =>
            run(() =>
              decideReady({
                projectId,
                deliverableId,
                approve: true,
                reason: "",
              }),
            )
          }
        >
          {t.approve}
        </Button>
        <DialogButton
          label={t.refuse}
          title={t.refuse}
          description={t.refuseHint}
        >
          {(close) => (
            <ReasonForm
              label={t.refuseReason}
              submitLabel={t.refuse}
              doneMessage={t.refused}
              run={(reason) =>
                decideReady({
                  projectId,
                  deliverableId,
                  approve: false,
                  reason,
                })
              }
              onDone={close}
            />
          )}
        </DialogButton>
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </div>
  );
}
