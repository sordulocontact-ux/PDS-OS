"use client";

import { IconPaperPlane2 } from "nucleo-sharp-essential";
import { useTransition } from "react";

import { IconRefresh } from "@/components/icons";
import { CopyButton } from "@/components/ui/copy-button";
import { RecordMenu } from "@/components/ui/record-menu";
import type { RowAction } from "@/components/ui/row-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { network } from "@/lib/i18n/fr/network";
import {
  emailNetworkFiche,
  markNetworkFicheSent,
  renewNetworkFiche,
  revokeNetworkFiche,
} from "@/lib/network/fiche-actions";

const t = network.page.networkFiche;

/**
 * The gestures on a contact's Réseau fiche after its link (Sacha
 * 23/11/2026): copy as an icon (copied = sent by hand), the others in
 * « ⋯ » — send by e-mail when PDS OS can, « Nouveau lien » (the former stops
 * working; once filled or revoked, to give another), « Révoquer le lien »
 * (confirmed; no new one).
 */
export function ContactFicheActions({
  contactId,
  url,
  notSent,
  canEmail,
}: {
  contactId: string;
  // The link, while the fiche can be filled.
  url: string | null;
  notSent: boolean;
  canEmail: boolean;
}) {
  const [, startMark] = useTransition();
  const email = useWriteSubmit(undefined, t.emailed.sentHere);
  const renew = useWriteSubmit(undefined, t.renewed);
  const error = email.error ?? renew.error;
  const extra: RowAction[] = [
    ...(url && canEmail
      ? [
          {
            key: "email",
            label: t.email,
            icon: IconPaperPlane2,
            onSelect: () => email.run(() => emailNetworkFiche(contactId)),
          },
        ]
      : []),
    {
      key: "renew",
      label: t.renew,
      icon: IconRefresh,
      onSelect: () => renew.run(() => renewNetworkFiche(contactId)),
    },
  ];
  return (
    <>
      <span className="flex shrink-0 items-center">
        {url && (
          <CopyButton
            value={url}
            label=""
            ariaLabel={t.copy}
            copiedLabel={t.copied}
            variant="ghost"
            size="icon-sm"
            onCopied={() =>
              notSent &&
              startMark(async () => {
                await markNetworkFicheSent(contactId);
              })
            }
          />
        )}
        <RecordMenu
          label={t.menu}
          extra={extra}
          remove={
            url
              ? {
                  label: t.revoke.label,
                  title: t.revoke.title,
                  body: t.revoke.body,
                  done: t.revoke.done,
                  pendingLabel: t.revoke.pending,
                  run: () => revokeNetworkFiche(contactId),
                }
              : undefined
          }
        />
      </span>
      {error && (
        <span className="w-full text-[length:var(--type-caption)] text-[color:var(--tone-danger-fg)]">
          {error}
        </span>
      )}
    </>
  );
}
