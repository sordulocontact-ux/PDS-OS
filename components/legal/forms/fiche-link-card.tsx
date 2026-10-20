"use client";

import { PrivateLinkCard } from "@/components/legal/private-link-card";
import { fr } from "@/lib/i18n/fr";
import { revokeLegalForm } from "@/lib/legal/forms/actions";
import type { FormRow } from "@/lib/legal/forms/queries";
import { formatDay, formatShortInstant } from "@/lib/utils/day";
import { mailtoHref } from "@/lib/utils/mailto";

const t = fr.legalForms.page;

/**
 * A fiche's private link, kept visible in its démarche (proto « Projet
 * complet », rule 19): `PrivateLinkCard` with the fiche's e-mail and
 * revocation, and when it was created, sent (by whom) and opened.
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
  const meta = [
    t.validUntil(formatDay(link.expiresAt)),
    t.createdOn(formatShortInstant(link.createdAt)),
    link.sentAt ? t.sentBy(link.sentBy, formatShortInstant(link.sentAt)) : null,
    row.openedAt ? t.openedOn(formatShortInstant(row.openedAt)) : null,
  ].filter((part): part is string => Boolean(part));
  return (
    <PrivateLinkCard
      url={link.url}
      meta={meta}
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
