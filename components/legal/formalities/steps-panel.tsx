"use client";

import { useLegalAction } from "@/components/legal/use-legal-action";
import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { ReasonForm } from "@/components/ui/reason-form";
import { legalFormalities } from "@/lib/i18n/fr/legal-formalities";
import { formalityStep } from "@/lib/legal/formalities/step-actions";
import type { FormalityView } from "@/lib/legal/formalities/types";

import { DepositForm } from "./deposit-form";
import { SacemAnswerForm } from "./sacem-answer-form";

const fr = { legalFormalities };

/** What follows the signatures, under them (Sacha, 10/11/2026): a partial
 * declaration, the deposit with its receipt, the processing, the answer —
 * registered, to correct or rejected, each with its proof (JUR-03). A
 * gesture that asks for something opens a dialog; no frise. Full-size
 * buttons, the next step in the primary one (« Enregistrer le dépôt »:
 * Sacha, 10/11/2026). */
export function StepsPanel({
  projectId,
  f,
}: {
  projectId: string;
  f: FormalityView;
}) {
  const t = fr.legalFormalities.page;
  const tr = fr.legalFormalities.transitions;
  const { pending, run } = useLegalAction();
  const proof = (url: string | null, label: string) =>
    url && (
      <Button
        variant="outline"
        nativeButton={false}
        render={<a href={url} target="_blank" rel="noreferrer" />}
      >
        {label}
      </Button>
    );

  return (
    // Nothing to do or show yet (the dossier still being filled): no empty
    // box, which would add its gap.
    <div className="flex flex-wrap items-center gap-2 empty:hidden">
      {f.status === "signatures_pending" && (
        <DialogButton
          label={t.partial}
          size="default"
          variant="outline"
          title={t.partial}
          description={t.partialReason}
        >
          {(close) => (
            <ReasonForm
              label={t.partialReason}
              submitLabel={t.partial}
              doneMessage={tr.partial}
              run={(reason) =>
                formalityStep(projectId, f.id, "partial", reason)
              }
              onDone={() => {
                close();
              }}
            />
          )}
        </DialogButton>
      )}
      {f.status === "ready_to_submit" && (
        <DialogButton
          label={t.submit}
          size="default"
          // The next step: the primary button (Sacha, 10/11/2026).
          variant="default"
          title={t.submit}
          description={t.submitBody}
        >
          {(close) => (
            <DepositForm
              projectId={projectId}
              formalityId={f.id}
              onDone={close}
            />
          )}
        </DialogButton>
      )}
      {f.status === "submitted" && (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(
              () => formalityStep(projectId, f.id, "processing", ""),
              undefined,
              tr.processing,
            )
          }
        >
          {t.processing}
        </Button>
      )}
      {["submitted", "processing"].includes(f.status) && (
        <DialogButton
          label={t.answer}
          size="default"
          // The next step: the primary button (Sacha, 10/11/2026).
          variant="default"
          title={t.answer}
          description={t.answerBody}
        >
          {(close) => (
            <SacemAnswerForm
              projectId={projectId}
              formalityId={f.id}
              onDone={close}
            />
          )}
        </DialogButton>
      )}
      {f.status === "rejected" && (
        <Button
          disabled={pending}
          onClick={() =>
            run(
              () => formalityStep(projectId, f.id, "restart", ""),
              undefined,
              tr.restart,
            )
          }
        >
          {t.restart}
        </Button>
      )}
      {proof(f.submissionFileUrl, t.viewDeposit)}
      {proof(f.completionFileUrl, t.viewRegistration)}
    </div>
  );
}
