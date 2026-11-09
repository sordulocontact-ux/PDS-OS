"use client";

import { IconEnvelopeOpen } from "nucleo-sharp-essential";
import type { ReactNode } from "react";

import { TextareaField } from "@/components/auth/textarea-field";
import { DocumentCard } from "@/components/ui/document-card";
import { FactRow, FactRows, type FactSource } from "@/components/ui/fact-row";
import { mail } from "@/lib/i18n/fr/mail";

const fr = { mail };

/**
 * THE e-mail PDS OS sends, shown before it leaves (docs/VISION-UX.md rule
 * 19, proto `mailCard`): a document headed « L'e-mail que PDS OS enverra »,
 * to whom with the source of the address, the subject, the message written
 * here, then what PDS OS adds at the end (the private link, created on
 * sending, and its validity), or the file it joins (`attachment`). The caller's button sends it: the Master's
 * package (`SendForm`), a person's fiche (`FichePanel`).
 */
export function MailCard({
  title,
  line,
  to,
  toControl,
  toSource,
  subject,
  message,
  onMessage,
  name,
  added,
  attachment,
  rows = 3,
}: {
  // Default « L'e-mail que PDS OS enverra ».
  title?: string;
  // Under the title: from whom, kept as the proof of sending.
  line?: string;
  to: string;
  // The address written in the card itself (prefilled from the Réseau,
  // corrected or typed here), in place of `to` (Sacha, 07/11/2026).
  toControl?: ReactNode;
  // Default « Réseau ».
  toSource?: FactSource | null;
  subject: string;
  message: string;
  onMessage: (message: string) => void;
  // The message field's name (one per card on a page).
  name: string;
  // Lines of the message field: more when the message is the whole e-mail.
  rows?: number;
  // « Ajouté automatiquement à la fin de l'e-mail : », « Ouvrir votre
  // dossier : » + the link (or « lien privé créé à l'envoi »), its validity.
  // None: the message is the whole e-mail (an authorisation request).
  added?: { intro?: string; open: string; link?: string; validity?: string };
  // A file joined to the e-mail (the authorisation contract), its name and
  // a way to see it on the right.
  attachment?: { name: string; side?: ReactNode };
}) {
  const t = fr.mail;
  return (
    <DocumentCard
      name={title ?? t.title}
      line={line ?? t.line}
      icon={IconEnvelopeOpen}
    >
      <FactRows className="rounded-none border-0">
        <FactRow
          label={t.to}
          value={to}
          control={toControl}
          source={toSource === undefined ? t.fromNetwork : toSource}
        />
        <FactRow label={t.subject} value={subject} />
        {attachment && (
          <FactRow
            label={t.attachment}
            value={attachment.name}
            source={null}
            side={attachment.side}
          />
        )}
      </FactRows>
      <div className="flex flex-col gap-3 px-3.5 pt-1 pb-3.5">
        <TextareaField
          name={name}
          label={t.message}
          rows={rows}
          maxLength={2000}
          value={message}
          onChange={(event) => onMessage(event.target.value)}
        />
        {added && (
        <p className="flex flex-col gap-1 rounded-lg bg-[var(--surface-soft)] px-3 py-2.5 break-words">
          <span className="text-[color:var(--text-secondary)]">
            {added.intro ?? t.added}
          </span>
          <span>
            {added.open} <i>{added.link ?? t.pageLink}</i>
          </span>
          <span>{added.validity ?? t.validity}</span>
        </p>
        )}
      </div>
    </DocumentCard>
  );
}
