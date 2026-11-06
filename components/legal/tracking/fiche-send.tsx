"use client";

import { Button } from "@/components/ui/button";
import { MailCard } from "@/components/ui/mail-card";
import { ToneCallout } from "@/components/ui/tone-callout";
import { legal } from "@/lib/i18n/fr/legal";
import { legalForms } from "@/lib/i18n/fr/legal-forms";
import type { FormRow } from "@/lib/legal/forms/queries";

const fr = { legal, legalForms };

/**
 * Sending a person's fiche, as the Master sends its package (proto
 * juridique-v3 `link`): with an address in the Réseau, the e-mail PDS OS
 * will send (`MailCard`), « Envoyer la fiche à … » and « Copier le lien
 * plutôt »; without one, why (the fiche is what collects it) and « Créer
 * le lien de la fiche ».
 */
export function FicheSend({
  row,
  projectTitle,
  message,
  onMessage,
  pending,
  onSend,
  onLinkOnly,
}: {
  row: FormRow;
  projectTitle: string;
  message: string;
  onMessage: (message: string) => void;
  pending: boolean;
  onSend: () => void;
  onLinkOnly: () => void;
}) {
  const p = fr.legal.panels.fiche;
  const t = fr.legalForms.page.emailed;
  if (!row.canEmail || !row.email)
    return (
      <>
        <ToneCallout tone="info">{p.noAddress(row.name)}</ToneCallout>
        <Button
          className="self-start"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={onLinkOnly}
        >
          {p.createLink}
        </Button>
      </>
    );
  return (
    <>
      <MailCard
        title={p.mailTitle}
        line={p.mailLine}
        to={`${row.name} <${row.email}>`}
        toSource={p.fromNetwork}
        subject={t.subject(projectTitle)}
        message={message}
        onMessage={onMessage}
        name={`fiche-message-${row.key}`}
        added={{
          intro: p.added,
          open: t.open,
          link: p.newLink,
          validity: p.validity,
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={onSend}
        >
          {pending ? p.sending : p.send(row.name)}
        </Button>
        <Button variant="outline" disabled={pending} onClick={onLinkOnly}>
          {p.linkInstead}
        </Button>
      </div>
    </>
  );
}
