"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { MailCard } from "@/components/ui/mail-card";
import type { MailEnvelope } from "@/lib/email/addresses";
import { contracts } from "@/lib/i18n/fr/contracts";
import { mailtoHref } from "@/lib/utils/mailto";

const fr = { contracts };

/** The file joined to a contract's e-mail: its name, opened in a tab. */
export type MailAttachment = { name: string; href: string };

const caption =
  "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]";

/**
 * A contract's e-mail prepared by PDS OS, as every e-mail PDS OS prepares
 * (MailCard, « L'e-mail que PDS OS enverra », Sacha 22/11/2026: « le
 * composant document mail »): to whom with its source in the Réseau, the
 * subject, the attachment opened in a tab, the message (editable), the
 * private link added at the end. `bySelf`: PDS OS does not send this one —
 * « Ouvrir dans ma messagerie », « Copier le message ». `onMessage`: the
 * message as edited, for the caller that sends it.
 */
export function ContractMailDraft({
  to,
  subject,
  attachment,
  link,
  message: initial,
  bySelf = true,
  smtp = false,
  onMessage,
  envelope,
}: {
  to: { contactId: string; email: string | null } | null;
  subject: string;
  attachment?: MailAttachment | null;
  link: string | null;
  message: string;
  bySelf?: boolean;
  // PDS OS can send e-mails (SMTP set), though not this one.
  smtp?: boolean;
  onMessage?: (message: string) => void;
  // Sent by PDS OS: who it goes to and its subject, written in the card.
  envelope?: {
    value: MailEnvelope;
    onChange: (next: MailEnvelope) => void;
    tried: boolean;
  };
}) {
  const t = fr.contracts.now.mail;
  const [message, setMessage] = useState(initial);
  const email = to?.email ?? null;
  return (
    <div className="flex flex-col gap-3">
      <MailCard
        to={email ?? t.noAddress}
        // Its address read in the Réseau (MailCard's default source).
        toSource={to ? undefined : null}
        subject={subject}
        message={message}
        onMessage={(m) => {
          setMessage(m);
          onMessage?.(m);
        }}
        name="mail-message"
        rows={7}
        envelope={envelope}
        added={link ? { open: t.link, link } : undefined}
        attachment={
          attachment
            ? {
                name: attachment.name,
                side: (
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={
                      <a
                        href={attachment.href}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                  >
                    {fr.contracts.now.openPdf}
                  </Button>
                ),
              }
            : undefined
        }
      />
      {bySelf && (
        <>
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
        </>
      )}
    </div>
  );
}
