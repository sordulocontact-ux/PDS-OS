"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { MailCard } from "@/components/ui/mail-card";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  sendDealMemo,
  sendMemoCorrection,
} from "@/lib/deals/memo-mail-actions";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";
import { isEmail } from "@/lib/utils/email";
import { mailtoHref } from "@/lib/utils/mailto";

const fr = { dealMemos };
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
  onDone,
}: {
  dealId: string;
  dealName: string;
  memoId: string;
  receivedSubject: string | null;
  // The files joined, by name.
  attachment: string;
  replyTo: MemoReplyTo | null;
  // The contacts in the loop who receive a copy, by name.
  copies: string[];
  canEmail: boolean;
  // The direction's reason: the e-mail asks the label for it.
  correction?: string | null;
  onDone: () => void;
}) {
  const c = fr.dealMemos.correction;
  const [address, setAddress] = useState(replyTo?.email ?? "");
  const [subject] = useState(
    correction !== null
      ? c.subject(dealName, receivedSubject)
      : t.subject(dealName, receivedSubject),
  );
  const [message, setMessage] = useState<string>(
    correction !== null ? c.message(correction) : t.message,
  );
  const [tried, setTried] = useState(false);
  const { pending, error, run } = useWriteSubmit(
    onDone,
    correction !== null ? c.done : t.done,
  );
  const valid = isEmail(address.trim());

  function send(byEmail: boolean) {
    setTried(true);
    if (byEmail && !valid) return;
    const action = correction !== null ? sendMemoCorrection : sendDealMemo;
    run(() =>
      action(dealId, memoId, {
        byEmail,
        to: {
          name: replyTo?.email === address.trim() ? replyTo.name : "",
          email: address.trim(),
        },
        subject,
        message,
      }),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <MailCard
        to={address}
        toControl={
          <Field
            name="deal-memo-to"
            type="email"
            label={t.address}
            hideLabel
            aria-required
            autoComplete="off"
            placeholder={t.addressPlaceholder}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            error={tried && !valid ? t.addressMissing : undefined}
          />
        }
        toSource={
          replyTo && address.trim() === replyTo.email
            ? replyTo.source === "email"
              ? t.fromEmail
              : undefined
            : null
        }
        subject={subject}
        message={message}
        onMessage={setMessage}
        name="deal-memo-message"
        rows={6}
        attachment={correction !== null ? undefined : { name: attachment }}
      />
      {correction === null && copies.length > 0 && (
        <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
          {t.copies(copies.join(", "))}
        </p>
      )}
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
              render={<a href={mailtoHref(address.trim(), subject, message)} />}
            >
              {t.openMail}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
