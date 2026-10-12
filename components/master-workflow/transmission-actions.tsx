"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { ReasonForm } from "@/components/ui/reason-form";
import { fr } from "@/lib/i18n/fr";
import {
  markTransmissionSent,
  revokeTransmission,
} from "@/lib/master-workflow/transmission-actions";

/** The owner's moves on the live link (PROJ-UX-09): say it was sent, or
 * revoke it with a reason; renewing is the step's « Renouveler le lien ». */
export function TransmissionActions({
  projectId,
  id,
  role,
  sent,
}: {
  projectId: string;
  id: string;
  role: "mix" | "mastering";
  sent: boolean;
}) {
  const t = fr.masterWorkflow.mix.life;
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {!sent && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await markTransmissionSent(projectId, id, role);
                if (result.ok) toast.success(t.markedSent);
                else toast.error(result.error);
              })
            }
          >
            {t.markSent}
          </Button>
        )}
        <DialogButton
          label={t.revoke}
          variant="ghost"
          size="sm"
          title={t.revokeTitle}
          description={t.revokeBody}
        >
          {(close) => (
            <ReasonForm
              label={t.revokeLabel}
              submitLabel={t.revoke}
              doneMessage={t.revoked_toast}
              run={(reason) => revokeTransmission(projectId, id, role, reason)}
              onDone={close}
            />
          )}
        </DialogButton>
      </div>
      <p className="text-caption text-[color:var(--text-secondary)]">
        {t.onlyOnce}
      </p>
    </div>
  );
}
