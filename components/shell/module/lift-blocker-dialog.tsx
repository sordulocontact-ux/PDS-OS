"use client";

import { IconBan } from "@/components/icons";
import { DialogButton } from "@/components/ui/dialog-button";
import { ReasonForm } from "@/components/ui/reason-form";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import { liftStepBlocker } from "@/lib/step-tools/actions";
import type { StepBlocker } from "@/lib/step-tools/model";
import { formatDayMonth } from "@/lib/utils/instant";

const t = fr.stepTools;

/**
 * « Lever le blocage » (proto liftModal): the blocker recalled, then what
 * solved it, required. The blocker stays in the history with it.
 */
export function LiftBlockerDialog({
  projectId,
  blocker: b,
}: {
  projectId: string;
  blocker: StepBlocker;
}) {
  return (
    <DialogButton
      label={t.lift.button}
      variant="outline"
      size="sm"
      title={t.lift.title}
      description={t.lift.description}
    >
      {(close) => (
        <>
          <ToneCallout tone="danger" as="div" className="flex gap-3">
            <IconBan aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              {b.description}
              <br />
              <span className="text-body-sm">
                {t.lift.context(
                  formatDayMonth(b.reportedAt),
                  b.reportedBy,
                  b.unblocker,
                )}
              </span>
            </span>
          </ToneCallout>
          <ReasonForm
            label={t.lift.label}
            hint={t.lift.hint}
            submitLabel={t.lift.button}
            doneMessage={t.lift.done}
            run={(note) =>
              liftStepBlocker({ projectId, blockerId: b.id, note })
            }
            onDone={close}
          />
        </>
      )}
    </DialogButton>
  );
}
