"use client";

import { DialogButton } from "@/components/ui/dialog-button";
import { contracts } from "@/lib/i18n/fr/contracts";

import { ContractMailDraft } from "./contract-mail-draft";
import type { SendMail } from "./contract-send-dialog";

const fr = { contracts };

/** « Relancer » (proto `relance`): the reminder ready, opened in the
 * person's own mail app or copied. PDS OS keeps no trace of a reminder
 * yet: nothing is recorded. */
export function ContractRemindDialog({
  name,
  mail,
}: {
  name: string;
  mail: Omit<SendMail, "viaLink">;
}) {
  const t = fr.contracts.now.remind;
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
        />
      )}
    </DialogButton>
  );
}
