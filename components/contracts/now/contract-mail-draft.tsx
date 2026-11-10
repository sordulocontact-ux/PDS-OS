"use client";

import { IconLink } from "nucleo-sharp-essential";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { routes } from "@/lib/auth/redirects";
import { contracts } from "@/lib/i18n/fr/contracts";
import { mailtoHref } from "@/lib/utils/mailto";

const fr = { contracts };

const caption =
  "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]";

/**
 * An e-mail prepared by PDS OS (proto `mailPreview`): to whom — their
 * address in the Réseau, with its source —, the subject, the attachment,
 * the message (editable) and the private link. Sent by the
 * person when PDS OS cannot (lib/utils/mailto.ts): « Ouvrir dans ma
 * messagerie » or « Copier le message ».
 */
export function ContractMailDraft({
  to,
  subject,
  attachment,
  link,
  message: initial,
  smtp = false,
}: {
  to: { contactId: string; email: string | null } | null;
  subject: string;
  // The file to attach and how to get it (« Voir le PDF »).
  attachment?: ReactNode;
  link: string | null;
  message: string;
  // PDS OS can send e-mails (SMTP set), though not this one.
  smtp?: boolean;
}) {
  const t = fr.contracts.now.mail;
  const [message, setMessage] = useState(initial);
  const email = to?.email ?? null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--border-default)] bg-card p-3">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[length:var(--type-body-sm)]">
          <dt className="text-[color:var(--text-secondary)]">{t.to}</dt>
          <dd className="flex flex-wrap items-baseline gap-x-2">
            {email ? (
              <b className="font-semibold break-all">{email}</b>
            ) : (
              <span className="text-[color:var(--tone-warning-fg)]">
                {t.noAddress}
              </span>
            )}
            {to && (
              <Link
                href={routes.networkContact(to.contactId)}
                className={`${caption} underline-offset-4 hover:underline`}
              >
                {t.toSource}
              </Link>
            )}
          </dd>
          <dt className="text-[color:var(--text-secondary)]">{t.subject}</dt>
          <dd className="font-semibold">{subject}</dd>
          {attachment && (
            <>
              <dt className="text-[color:var(--text-secondary)]">
                {t.attachment}
              </dt>
              <dd className="flex flex-wrap items-center gap-2">
                {attachment}
              </dd>
            </>
          )}
        </dl>
        <TextareaField
          name="mail-message"
          label={t.message}
          rows={7}
          maxLength={4000}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        {link && (
          <p className={`flex min-w-0 items-center gap-2 ${caption}`}>
            <IconLink aria-hidden className="size-4 shrink-0" />
            <span className="shrink-0">{t.link} :</span>
            <code className="truncate">{link}</code>
          </p>
        )}
      </div>
      <p className={caption}>{smtp ? t.noteSmtp : t.note}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<a href={mailtoHref(email ?? "", subject, message)} />}
        >
          {t.open}
        </Button>
        <CopyButton
          value={() => `${subject}\n\n${message}`}
          label={t.copy}
          copiedLabel={t.copied}
          variant="ghost"
          size="sm"
        />
      </div>
    </div>
  );
}
