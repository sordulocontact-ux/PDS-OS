"use client";

import { MailComposeDialog } from "@/components/mailbox/mail-compose-dialog";
import { emptyDraft } from "@/components/mailbox/mail-compose-draft";

/** « Écrire un mail »: the mailbox's empty compose window. */
export default function QuickMail({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <MailComposeDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      draft={emptyDraft}
    />
  );
}
