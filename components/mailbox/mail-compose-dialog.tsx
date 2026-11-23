"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { MailCard } from "@/components/ui/mail-card";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { addressesOf, envelopeErrors } from "@/lib/email/addresses";
import { mailboxCompose } from "@/lib/i18n/fr/mailbox-compose";
import { sendMailboxMail } from "@/lib/mailbox/compose-actions";

import type { MailDraft } from "./mail-compose-draft";

const t = mailboxCompose;

function ComposeForm({
  draft,
  onClose,
}: {
  draft: MailDraft;
  onClose: () => void;
}) {
  const [envelope, setEnvelope] = useState(draft.envelope);
  const [message, setMessage] = useState(draft.message);
  const [tried, setTried] = useState(false);
  const { pending, error, run } = useWriteSubmit(onClose, t.done);
  const messageError = !message.trim() ? t.messageMissing : undefined;
  const wrong =
    Object.values(envelopeErrors(envelope)).some(Boolean) || !!messageError;
  const missing = Object.values(envelopeErrors(envelope)).filter(
    Boolean,
  ).length;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (wrong) return;
        run(() =>
          sendMailboxMail({
            envelope: {
              to: addressesOf(envelope.to),
              cc: addressesOf(envelope.cc),
              bcc: addressesOf(envelope.bcc),
            },
            subject: envelope.subject,
            message,
            replyToId: draft.replyToId,
          }),
        );
      }}
    >
      <MailCard
        title={draft.replyToId ? t.replyTitle : t.title}
        line={t.line}
        to={envelope.to}
        toSource={null}
        subject={envelope.subject}
        envelope={{ value: envelope, onChange: setEnvelope, tried }}
        message={message}
        onMessage={setMessage}
        name="mailbox-message"
        rows={9}
        maxLength={20000}
      />
      {tried && messageError && (
        <FormMessage kind="error">{messageError}</FormMessage>
      )}
      {tried && wrong && missing > 0 && (
        <FormMessage kind="error">{t.errors.invalid}</FormMessage>
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.send}
        pendingLabel={t.sending}
        onCancel={onClose}
      />
    </form>
  );
}

/** The writing window of the page « Mails »: new mail or an answer. */
export function MailComposeDialog({
  open,
  onOpenChange,
  draft,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: MailDraft;
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={draft.replyToId ? t.replyTitle : t.title}
      closeLabel={t.close}
      size="medium"
    >
      <ComposeForm draft={draft} onClose={() => onOpenChange(false)} />
    </FormDialog>
  );
}
