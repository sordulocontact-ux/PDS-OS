"use client";

import { IconCheck } from "nucleo-sharp-essential";
import { useState, useSyncExternalStore } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { IconBan } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { PersonLinkCard } from "@/components/ui/person-link-card";
import { ReasonForm } from "@/components/ui/reason-form";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { contactLinks } from "@/lib/i18n/fr/contact-links";
import {
  issueContactLink,
  markContactLinkSent,
  remindContactLink,
  revokeContactLink,
} from "@/lib/portal/contact-link-actions";
import type { ContactLinkRow } from "@/lib/portal/contact-links";
import { formatDay } from "@/lib/utils/day";
import { mailtoHref } from "@/lib/utils/mailto";

const fr = { contactLinks };

const t = fr.contactLinks;

const useOrigin = () =>
  useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );

/**
 * A person's page by project in a démarche of the Juridique, in the card of
 * the Master's link (`PersonLinkCard`, Sacha 06/11/2026: one link per
 * person, one pattern): « Relancer » by e-mail when PDS OS can (else a
 * ready e-mail), « Nouveau lien », and in « ⋯ » « Marquer comme envoyé »
 * and « Révoquer » with why. Read only for who does not manage the links.
 */
export function ContactLinkCard({
  projectId,
  projectTitle,
  row,
  canEdit,
  canEmail,
}: {
  projectId: string;
  projectTitle: string;
  row: ContactLinkRow;
  canEdit: boolean;
  // PDS OS can e-mail this person (SMTP set, address in the Réseau).
  canEmail: boolean;
}) {
  const origin = useOrigin();
  const [revoking, setRevoking] = useState(false);
  const write = useWriteSubmit(() => undefined, t.reminded);
  const link = row.link;
  const url = link?.path && origin ? `${origin}${link.path}` : null;
  const state = !link
    ? "none"
    : link.openedAt
      ? "opened"
      : link.sentAt
        ? "sent"
        : "notSent";
  return (
    <PersonLinkCard
      name={row.name}
      line={link ? t.validUntil(formatDay(link.expiresAt)) : null}
      state={state}
      url={url}
      pending={write.pending}
      onRemind={
        canEdit && canEmail
          ? () => write.run(() => remindContactLink(projectId, row.contactId))
          : undefined
      }
      remindHref={
        canEdit && !canEmail && url
          ? mailtoHref(
              row.email ?? "",
              t.email.remindSubject(projectTitle),
              `${t.email.remindBody}\n\n${url}`,
            )
          : null
      }
      onRenew={
        canEdit
          ? () =>
              write.run(
                () => issueContactLink(projectId, row.contactId, true),
                t.renewed,
              )
          : undefined
      }
      actions={
        canEdit && link
          ? [
              ...(!link.sentAt
                ? [
                    {
                      key: "sent",
                      label: t.markSent,
                      icon: IconCheck,
                      onSelect: () =>
                        write.run(
                          () => markContactLinkSent(projectId, link.id),
                          t.marked,
                        ),
                    },
                  ]
                : []),
              {
                key: "revoke",
                label: t.revoke,
                icon: IconBan,
                onSelect: () => setRevoking(true),
              },
            ]
          : []
      }
      empty={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[color:var(--text-secondary)]">
            {t.noLink(row.name)}
          </span>
          {canEdit && (
            <Button
              size="sm"
              disabled={write.pending}
              onClick={() =>
                write.run(
                  () => issueContactLink(projectId, row.contactId),
                  t.created,
                )
              }
            >
              {t.create}
            </Button>
          )}
        </div>
      }
    >
      {revoking && link && (
        <ReasonForm
          label={t.revokeReason}
          hint={t.revokeDescription}
          submitLabel={t.revoke}
          doneMessage={t.revoked}
          run={(reason) => revokeContactLink(projectId, link.id, reason)}
          onDone={() => setRevoking(false)}
        />
      )}
      <FormMessage kind="error">{write.error}</FormMessage>
    </PersonLinkCard>
  );
}
