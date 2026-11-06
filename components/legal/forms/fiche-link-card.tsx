"use client";

import { PrivateLinkCard } from "@/components/legal/private-link-card";
import { legalForms } from "@/lib/i18n/fr/legal-forms";
import { revokeLegalForm } from "@/lib/legal/forms/actions";
import type { FormRow } from "@/lib/legal/forms/queries";
import { mailtoHref } from "@/lib/utils/mailto";

const fr = { legalForms };

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
  url: justMade,
  pending,
  onRenew,
  onMarkSent,
}: {
  projectId: string;
  projectTitle: string;
  row: FormRow;
  // The link just created, before the page reads it again.
  url?: string | null;
  pending: boolean;
  onRenew: () => void;
  // While it is not marked sent (PDS OS did not e-mail it).
  onMarkSent?: () => void;
}) {
  const link = row.link;
  if (!row.formId || (!link && !justMade)) return null;
  const formId = row.formId;
  const url = justMade ?? link?.url ?? null;
  return (
    <PrivateLinkCard
      name={row.name}
      state={
        row.openedAt || row.complement
          ? "opened"
          : link?.sentAt
            ? "sent"
            : "unsent"
      }
      url={url}
      onMarkSent={onMarkSent}
      remindHref={
        !url
          ? null
          : row.complement
            ? // The complement asked, with its message (JUR-06).
              mailtoHref(
                "",
                t.emailSubject(projectTitle),
                `${row.complement.note ?? ""}\n\n${url}`.trim(),
              )
            : row.state === "sent"
              ? mailtoHref(
                  "",
                  t.emailSubject(projectTitle),
                  t.emailBody(row.name, projectTitle, url),
                )
              : null
      }
      pending={pending}
      onRenew={onRenew}
      revoke={(reason) => revokeLegalForm(projectId, formId, reason)}
    />
  );
}
