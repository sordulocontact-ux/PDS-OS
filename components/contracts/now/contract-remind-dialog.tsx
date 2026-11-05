"use client";

import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { remindContractSigner } from "@/lib/contracts/send-actions";
import { contracts } from "@/lib/i18n/fr/contracts";

import { ContractMailDraft } from "./contract-mail-draft";
import type { SendMail } from "./contract-send-dialog";

const fr = { contracts };

/** « Relancer » (proto `relance`): PDS OS e-mails the reminder itself,
 * with the link of the person's page, when it can (`mail.auto`); else the
 * reminder is ready, opened in the person's own mail app or copied. PDS OS
 * keeps no trace of a reminder yet: nothing is recorded. */
export function ContractRemindDialog({
  name,
  contractId,
  projectId,
  mail,
}: {
  name: string;
  contractId: string;
  projectId: string | null;
  mail: Omit<SendMail, "viaLink">;
}) {
  const t = fr.contracts.now.remind;
  const submit = useWriteSubmit(undefined, fr.contracts.now.auto.remindDone);
  if (mail.auto)
    return (
      <span className="flex flex-col items-start gap-1">
        <Button
          variant="outline"
          size="lg"
          title={fr.contracts.now.auto.remindDescription}
          disabled={submit.pending}
          onClick={() =>
            submit.run(() => remindContractSigner(contractId, projectId))
          }
        >
          {t.button}
        </Button>
        {submit.error && (
          <span className="text-[length:var(--type-caption)] text-[color:var(--tone-danger-fg)]">
            {submit.error}
          </span>
        )}
      </span>
    );
  return (
    <DialogButton
      label={t.button}
      variant="outline"
      size="lg"
      title={t.title(name)}
      description={t.description}
      wide
    >
      {() => (
        <ContractMailDraft
          to={mail.to}
          subject={mail.subject}
          attachment={mail.attachment}
          link={mail.link}
          message={mail.message}
          smtp={mail.smtp}
        />
      )}
    </DialogButton>
  );
}
