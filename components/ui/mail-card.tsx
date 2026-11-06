"use client";

import { IconEnvelopeOpen } from "nucleo-sharp-essential";

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
 * sending, and its validity). The caller's button sends it: the Master's
 * package (`SendForm`), a person's fiche (`FichePanel`).
 */
export function MailCard({
  title,
  line,
  to,
  toSource,
  subject,
  message,
  onMessage,
  name,
  added,
}: {
  title: string;
  // Under the title: from whom, kept as the proof of sending.
  line: string;
  to: string;
  toSource?: FactSource | null;
  subject: string;
  message: string;
  onMessage: (message: string) => void;
  // The message field's name (one per card on a page).
  name: string;
  // « Ajouté automatiquement à la fin de l'e-mail : », « Ouvrir votre
  // dossier : » + the link (or « lien privé créé à l'envoi »), its validity.
  added: { intro: string; open: string; link: string; validity: string };
}) {
  const t = fr.mail;
  return (
    <DocumentCard name={title} line={line} icon={IconEnvelopeOpen}>
      <FactRows className="rounded-none border-0">
        <FactRow label={t.to} value={to} source={toSource ?? null} />
        <FactRow label={t.subject} value={subject} />
      </FactRows>
      <div className="flex flex-col gap-3 px-3.5 pt-1 pb-3.5">
        <TextareaField
          name={name}
          label={t.message}
          rows={3}
          maxLength={2000}
          value={message}
          onChange={(event) => onMessage(event.target.value)}
        />
        <p className="flex flex-col gap-1 rounded-lg bg-[var(--surface-soft)] px-3 py-2.5 break-words">
          <span className="text-[color:var(--text-secondary)]">
            {added.intro}
          </span>
          <span>
            {added.open} <i>{added.link}</i>
          </span>
          <span>{added.validity}</span>
        </p>
      </div>
    </DocumentCard>
  );
}
