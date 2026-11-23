"use client";

import { IconPaperPlane2, IconXmark } from "nucleo-sharp-essential";
import { useTransition } from "react";

import { CopyButton } from "@/components/ui/copy-button";
import { IconAction } from "@/components/ui/icon-action";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { network } from "@/lib/i18n/fr/network";
import {
  emailNetworkFiche,
  markNetworkFicheSent,
  renewNetworkFiche,
} from "@/lib/network/fiche-actions";

const t = network.page.networkFiche;

/**
 * The gestures on a contact's Réseau fiche, as icons after its link (Figma
 * « Coordonnées », node 317:5819, Sacha 23/11/2026): copy (copied = sent by
 * hand), ✕ « Nouveau lien » (the former stops working; alone once the
 * fiche is filled, to ask for an update), send by e-mail when PDS OS can.
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
        <IconAction
          label={t.renew}
          icon={IconXmark}
          variant="ghost"
          size="icon-sm"
          disabled={renew.pending}
          busy={renew.pending}
          onClick={() => renew.run(() => renewNetworkFiche(contactId))}
        />
        {url && canEmail && (
          <IconAction
            label={t.email}
            icon={IconPaperPlane2}
            variant="ghost"
            size="icon-sm"
            disabled={email.pending}
            busy={email.pending}
            onClick={() => email.run(() => emailNetworkFiche(contactId))}
          />
        )}
      </span>
      {error && (
        <span className="w-full text-[length:var(--type-caption)] text-[color:var(--tone-danger-fg)]">
          {error}
        </span>
      )}
    </>
  );
}
