"use client";

import { DialogButton } from "@/components/ui/dialog-button";
import { ReasonForm } from "@/components/ui/reason-form";
import { setSelfApproval } from "@/lib/design/actions/roles";
import { fr } from "@/lib/i18n/fr";

/**
 * The project's governance of approvals (MKT-C2-08): by rule nobody
 * approves what they submitted; a validator may allow it as an exception,
 * with a reason, and restore the rule. Both are traced.
 */
export function SelfApprovalSwitch({
  projectId,
  allowed,
  canChange,
}: {
  projectId: string;
  allowed: boolean;
  canChange: boolean;
}) {
  const t = fr.conceptionRoles.governance;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-body-md font-semibold">{t.title}</h3>
      <p className="text-caption text-muted-foreground">
        {allowed ? t.allowed : t.refused}
      </p>
      {canChange && (
        <div>
          <DialogButton
            label={allowed ? t.refuse : t.allow}
            title={allowed ? t.refuseTitle : t.allowTitle}
            description={t.body}
          >
            {(close) => (
              <ReasonForm
                label={t.reason}
                submitLabel={allowed ? t.refuse : t.allow}
                doneMessage={t.done}
                run={(reason) => setSelfApproval(projectId, !allowed, reason)}
                onDone={close}
              />
            )}
          </DialogButton>
        </div>
      )}
    </div>
  );
}
