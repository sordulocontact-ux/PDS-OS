"use client";

import { useState, type ReactNode } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { MailCard } from "@/components/ui/mail-card";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  sendDealMemo,
  sendMemoCorrection,
} from "@/lib/deals/memo-mail-actions";
import { contracts } from "@/lib/i18n/fr/contracts";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";
import {
  addressesOf,
  envelopeErrors,
  type MailEnvelope,
} from "@/lib/email/addresses";
import { mailtoHref } from "@/lib/utils/mailto";

const fr = { contracts, dealMemos };
const t = fr.dealMemos.send;

export type MemoReplyTo = {
  name: string;
  email: string;
  // The memo's sender, or the counterpart's address in the Réseau.
  source: "email" | "network";
};

/**
 * « Renvoyer l'accord validé » (réunion avec Ibé du 18/11/2026: « le
 * business manager puisse renvoyer à la maison de disques, validé par
 * mail »): the e-mail PDS OS sends, shown before it leaves (`MailCard`,
 * docs/VISION-UX.md rule 19) — to the address that sent the memo, else the
 * counterpart's, correctable in the card; the memo joined; the contacts in
 * the loop in copy. « Envoyé autrement » stays the way out; without SMTP,
 * the same card for one's own mail app, then « Marquer comme envoyé ».
 * `correction` (Sacha 22/11/2026): the same card asks the label for the
 * changes the direction wrote (its reason in the message), nothing joined,
 * no copy; the deal's address in reply-to brings their next version back.
 */
export function DealMemoSendForm({
  dealId,
  dealName,
  memoId,
  receivedSubject,
  attachment,
  replyTo,
  copies,
  canEmail,
  correction = null,
  open = null,
  onDone,
}: {
  dealId: string;
  dealName: string;
  memoId: string;
  receivedSubject: string | null;
  // The files joined, by name.
  attachment: string;
  replyTo: MemoReplyTo | null;
  // The loop's contacts' addresses, prefilled in « Cc ».
  copies: string[];
  canEmail: boolean;
  // The direction's reason: the e-mail asks the label for it.
  correction?: string | null;
  // A way to open the memo joined, beside its name (Sacha 22/11/2026: « on
  // voudrait le voir pour valider le mail »).
  open?: ReactNode;
  onDone: () => void;
}) {
  const c = fr.dealMemos.correction;
  // Who it goes to, written in the card (Sacha 22/11/2026): the memo's
  // sender (else the counterpart's address), the loop in « Cc ».
  const [envelope, setEnvelope] = useState<MailEnvelope>({
    to: replyTo?.email ?? "",
    cc: correction === null ? copies.join(", ") : "",
    bcc: "",
    subject:
      correction !== null
        ? c.subject(dealName, receivedSubject)
        : t.subject(dealName, receivedSubject),
  });
  const [message, setMessage] = useState<string>(
    correction !== null ? c.message(correction) : t.message,
  );
  const [tried, setTried] = useState(false);
  const { pending, error, run } = useWriteSubmit(
    onDone,
    correction !== null ? c.done : t.done,
  );
  const wrong = Object.values(envelopeErrors(envelope)).some(Boolean);

  function send(byEmail: boolean) {
    setTried(true);
    if (byEmail && wrong) return;
    const action = correction !== null ? sendMemoCorrection : sendDealMemo;
    run(() =>
      action(dealId, memoId, {
        byEmail,
        envelope: {
          to: addressesOf(envelope.to),
          cc: addressesOf(envelope.cc),
          bcc: addressesOf(envelope.bcc),
        },
        subject: envelope.subject,
        message,
      }),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <MailCard
        title={canEmail ? undefined : fr.contracts.now.mail.title}
        line={canEmail ? undefined : fr.contracts.now.mail.line}
        to={envelope.to}
        subject={envelope.subject}
        envelope={{ value: envelope, onChange: setEnvelope, tried }}
        toSource={
          replyTo && envelope.to.trim() === replyTo.email
            ? replyTo.source === "email"
              ? t.fromEmail
              : undefined
            : null
        }
        message={message}
        onMessage={setMessage}
        name="deal-memo-message"
        rows={6}
        attachment={
          correction !== null ? undefined : { name: attachment, side: open }
        }
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap gap-2">
        {canEmail ? (
          <>
            <Button
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={() => send(true)}
            >
              {pending ? t.sending : t.send}
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => send(false)}
            >
              {t.sentOtherwise}
            </Button>
          </>
        ) : (
          <>
            <Button disabled={pending} onClick={() => send(false)}>
              {t.markSent}
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <a
                  href={mailtoHref(
                    addressesOf(envelope.to).join(","),
                    envelope.subject,
                    message,
                    {
                      cc: addressesOf(envelope.cc).join(","),
                      bcc: addressesOf(envelope.bcc).join(","),
                    },
                  )}
                />
              }
            >
              {t.openMail}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
