"use client";

import { DialogButton } from "@/components/ui/dialog-button";
import { ReasonForm } from "@/components/ui/reason-form";
import { startConceptionWithoutExchange } from "@/lib/design/actions/start";
import { fr } from "@/lib/i18n/fr";

/**
 * « Commencer sans échange » (MKT-C2-03, 05): the creative exchange is the
 * main way in; starting without one says why — the reason stays on the step
 * it passes over. Opens the direct work.
 */
export function StartConceptionForm({ projectId }: { projectId: string }) {
  const t = fr.conception.entry;
  return (
    <DialogButton
      label={t.start}
      size="lg"
      title={t.startTitle}
      description={t.startBody}
    >
      {(close) => (
        <ReasonForm
          label={t.startReason}
          submitLabel={t.start}
          doneMessage={t.started}
          run={(reason) => startConceptionWithoutExchange(projectId, reason)}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}
