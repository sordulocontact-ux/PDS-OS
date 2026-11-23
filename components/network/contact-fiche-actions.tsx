"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { network } from "@/lib/i18n/fr/network";
import {
  emailNetworkFiche,
  markNetworkFicheSent,
  renewNetworkFiche,
} from "@/lib/network/fiche-actions";

const t = network.page.networkFiche;

/**
 * The gestures on a contact's Réseau fiche: « Copier le lien » (copied =
 * sent by hand), « Envoyer par e-mail » when PDS OS can, « Nouveau lien »
 * (the former stops working; alone once the fiche is filled, to ask for an
 * update).
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
    <span className="flex flex-wrap items-center gap-2">
      {url && (
        <CopyButton
          value={url}
          label={t.copy}
          copiedLabel={t.copied}
          size="sm"
          onCopied={() =>
            notSent &&
            startMark(async () => {
              await markNetworkFicheSent(contactId);
            })
          }
        />
      )}
      {url && canEmail && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={email.pending}
          onClick={() => email.run(() => emailNetworkFiche(contactId))}
        >
          {t.email}
        </Button>
      )}
      {/* Text only beside an outlined button, outlined when alone (DESIGN.md
          « Bouton secondaire »). */}
      <Button
        type="button"
        variant={url ? "ghost" : "outline"}
        size="sm"
        title={t.renewHint}
        disabled={renew.pending}
        onClick={() => renew.run(() => renewNetworkFiche(contactId))}
      >
        {t.renew}
      </Button>
      {error && (
        <span className="w-full text-[length:var(--type-caption)] text-[color:var(--tone-danger-fg)]">
          {error}
        </span>
      )}
    </span>
  );
}
