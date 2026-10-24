"use client";

import { PrivateLinkCard } from "@/components/legal/private-link-card";
import { fr } from "@/lib/i18n/fr";
import { revokeLegalForm } from "@/lib/legal/forms/actions";
import type { FormRow } from "@/lib/legal/forms/queries";
import { mailtoHref } from "@/lib/utils/mailto";

const t = fr.legalForms.page;

/**
 * A fiche's private link, kept visible in its démarche (proto « Projet
 * complet », rule 19): `PrivateLinkCard` with the fiche's e-mail and
 * revocation; whether it was sent or opened says its pill.
 */
export function FicheLinkCard({
  projectId,
  projectTitle,
  row,
  pending,
  onRenew,
}: {
  projectId: string;
  projectTitle: string;
  row: FormRow;
  pending: boolean;
  onRenew: () => void;
}) {
  const link = row.link;
  if (!link || !row.formId) return null;
  const formId = row.formId;
  return (
    <PrivateLinkCard
      name={row.name}
      state={row.openedAt ? "opened" : link.sentAt ? "sent" : "unsent"}
      url={link.url}
      remindHref={
        link.url && row.state === "sent"
          ? mailtoHref(
              "",
              t.emailSubject(projectTitle),
              t.emailBody(row.name, projectTitle, link.url),
            )
          : null
      }
      pending={pending}
      onRenew={onRenew}
      revoke={(reason) => revokeLegalForm(projectId, formId, reason)}
    />
  );
}
