"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { decideSheet } from "@/lib/activations/sheet-actions";
import { activationWork } from "@/lib/i18n/fr/activation-work";

import { ReasonForm } from "@/components/ui/reason-form";

const fr = { activationWork };

const t = fr.activationWork.sheet;

/** « Soumettre » (writer, on a draft or a version sent back), then the PDS
 * validator's decision on a submitted version. */
export function SheetDecisions({
  projectId,
  sheetId,
  status,
  canWrite,
  canValidate,
}: {
  projectId: string;
  sheetId: string;
  status: string;
  canWrite: boolean;
  canValidate: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const act = (action: "submit" | "validate", done: string) =>
    startTransition(async () => {
      const result = await decideSheet({
        projectId,
        sheetId,
        action,
        comment: "",
      });
      if (result.ok) toast.success(done);
      else toast.error(result.error);
    });
  const reasoned = (
    action: "request_changes" | "refuse",
    label: string,
    title: string,
    done: string,
  ) => (
    <DialogButton
      label={label}
      size="sm"
      variant="ghost"
      title={title}
      description={t.decisionDescription}
    >
      {(close) => (
        <ReasonForm
          label={t.comment}
          submitLabel={label}
          doneMessage={done}
          run={(comment) =>
            decideSheet({ projectId, sheetId, action, comment })
          }
          onDone={close}
        />
      )}
    </DialogButton>
  );
  return (
    <div className="flex flex-wrap gap-2">
      {canWrite && (status === "draft" || status === "changes_requested") && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => act("submit", t.submitted)}
        >
          {t.submit}
        </Button>
      )}
      {canValidate && status === "to_validate" && (
        <>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => act("validate", t.validated)}
          >
            {t.validate}
          </Button>
          {reasoned(
            "request_changes",
            t.requestChanges,
            t.requestChangesTitle,
            t.changesRequested,
          )}
          {reasoned("refuse", t.refuse, t.refuseTitle, t.refused)}
        </>
      )}
    </div>
  );
}
