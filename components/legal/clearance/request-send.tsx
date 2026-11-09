"use client";

import type { ReactNode } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { MailCard } from "@/components/ui/mail-card";
import { legalClearance } from "@/lib/i18n/fr/legal-clearance";
import { isEmail } from "@/lib/utils/email";
import { mailtoHref } from "@/lib/utils/mailto";

const fr = { legalClearance };

type SendLabels = {
  // Without SMTP: the card's title and line.
  title: string;
  ownMail: string;
  send: string;
  sendTo: (names: string) => string;
  sent: string;
  sentOtherwise: string;
};

export type RequestRecipient = {
  key: string;
  name: string;
  contactId: string | null;
  // Their address in the Réseau, null when it has none.
  email: string | null;
};

/**
 * « Envoyer la demande » (Sacha, 07/11/2026: « une mini interface de
 * mail »): the request as an e-mail (`MailCard`), its « À » written in the
 * card — each holder chosen above, their address of the Réseau filled in,
 * correctable, typed when there is none — and the message editable; PDS OS
 * sends it (« Envoyer à … »), or the person sends
 * it their way and says so. Without SMTP, the same card to open in their
 * own mail app. The parent validates and runs the gesture. « Signer » sends
 * the contract the same way (Sacha, 09/11/2026): its words in `labels`,
 * the contract in `attachment`.
 */
export function RequestSend({
  canEmail,
  recipients,
  typed,
  onType,
  subject,
  message,
  onMessage,
  name,
  tried,
  missingCount,
  pending,
  onSend,
  labels,
  attachment,
}: {
  canEmail: boolean;
  recipients: RequestRecipient[];
  // The addresses as written in the card, by recipient (none: the Réseau's).
  typed: Record<string, string>;
  onType: (key: string, value: string) => void;
  subject: string;
  message: string;
  onMessage: (message: string) => void;
  name: string;
  tried: boolean;
  // Holders or addresses still missing, said once the person tried.
  missingCount: number;
  pending: boolean;
  onSend: (byEmail: boolean) => void;
  // The buttons' and card's words; default: the request's.
  labels?: SendLabels;
  attachment?: { name: string; side?: ReactNode };
}) {
  const t = fr.legalClearance.flow;
  const words: SendLabels = labels ?? {
    title: t.stepSend,
    ownMail: t.ownMail,
    send: t.send,
    sendTo: t.sendTo,
    sent: t.sent,
    sentOtherwise: t.sentOtherwise,
  };
  const addressOf = (r: RequestRecipient) =>
    (typed[r.key] ?? r.email ?? "").trim();
  // « Réseau » under the row while every address is the Réseau's.
  const fromNetwork = recipients.every(
    (r) => r.email && addressOf(r) === r.email,
  );
  const names = recipients.map((r) => r.name).join(" et ");
  const toControl =
    recipients.length > 0 ? (
      <div className="flex flex-col gap-3">
        {recipients.map((r) => (
          <div key={r.key} className="flex flex-col gap-1.5">
            {recipients.length > 1 && (
              <span className="text-[length:var(--type-body-sm)] font-medium">
                {r.name}
              </span>
            )}
            <Field
              name={`${name}-to-${r.key}`}
              type="email"
              label={t.addressOf(r.name)}
              hideLabel
              aria-required
              autoComplete="off"
              placeholder={t.addressPlaceholder(r.name)}
              hint={!r.email && r.contactId ? t.addressSaved : undefined}
              value={typed[r.key] ?? r.email ?? ""}
              onChange={(event) => onType(r.key, event.target.value)}
              error={
                tried && !isEmail(addressOf(r)) ? t.addressMissing : undefined
              }
            />
          </div>
        ))}
      </div>
    ) : undefined;
  return (
    <>
      <MailCard
        title={canEmail ? undefined : words.title}
        line={canEmail ? undefined : words.ownMail}
        to={t.toPending}
        toControl={toControl}
        toSource={fromNetwork && recipients.length > 0 ? undefined : null}
        subject={subject}
        message={message}
        onMessage={onMessage}
        name={name}
        rows={7}
        attachment={attachment}
      />
      {tried && missingCount > 0 && (
        <FormMessage kind="error">{t.missingCount(missingCount)}</FormMessage>
      )}
      <div className="flex flex-wrap gap-2">
        {canEmail ? (
          <>
            <Button
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={() => onSend(true)}
            >
              {pending ? t.sending : names ? words.sendTo(names) : words.send}
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => onSend(false)}
            >
              {words.sentOtherwise}
            </Button>
          </>
        ) : (
          <>
            <Button disabled={pending} onClick={() => onSend(false)}>
              {words.sent}
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <a
                  href={mailtoHref(
                    recipients.map(addressOf).filter(Boolean).join(","),
                    subject,
                    message,
                  )}
                />
              }
            >
              {t.openMail}
            </Button>
          </>
        )}
      </div>
    </>
  );
}
