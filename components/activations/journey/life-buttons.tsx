"use client";

import { DialogButton } from "@/components/ui/dialog-button";
import { ReasonForm } from "@/components/ui/reason-form";
import { setActivationLife } from "@/lib/activations/journey-actions";
import { fr } from "@/lib/i18n/fr";

const t = fr.activationJourney.life;

/**
 * « Suspendre » and « Annuler l'activation » at the foot of the open
 * activation (proto reasonModal): the glass modal says what follows and
 * asks the reason. « Reprendre » sits in « Maintenant ».
 */
export function LifeButtons({
  projectId,
  activationId,
  title,
  canSuspend,
}: {
  projectId: string;
  activationId: string;
  title: string;
  canSuspend: boolean;
}) {
  const ids = { projectId, activationId };
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {canSuspend && (
        <DialogButton
          label={t.suspend}
          variant="ghost"
          title={t.suspendTitle(title)}
          description={t.suspendEffect}
        >
          {(close) => (
            <ReasonForm
              label={t.reason}
              submitLabel={t.suspend}
              doneMessage=""
              run={(reason) =>
                setActivationLife({ ...ids, action: "suspend", reason })
              }
              onDone={close}
            />
          )}
        </DialogButton>
      )}
      <DialogButton
        label={t.cancel}
        variant="ghost"
        title={t.cancelTitle(title)}
        description={t.cancelEffect}
      >
        {(close) => (
          <ReasonForm
            label={t.reason}
            submitLabel={t.cancel}
            doneMessage=""
            run={(reason) =>
              setActivationLife({ ...ids, action: "cancel", reason })
            }
            onDone={close}
          />
        )}
      </DialogButton>
    </div>
  );
}
