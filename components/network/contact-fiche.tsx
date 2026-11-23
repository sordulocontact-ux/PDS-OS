import { ContactFicheActions } from "@/components/network/contact-fiche-actions";
import { network } from "@/lib/i18n/fr/network";
import type { NetworkFiche } from "@/lib/network/fiche";
import { formatDate } from "@/lib/release/format";

const t = network.page.networkFiche;

/**
 * A contact's own fiche de renseignements, the first line of
 * « Coordonnées » (Figma node 317:5819, Sacha 23/11/2026): its link, cut on
 * one line, then its gestures as icons. Once filled (no link to give), the
 * day it was. Shown only to who may manage it (`loadNetworkFiche`).
 */
export function ContactFiche({
  contactId,
  fiche,
  canEmail,
}: {
  contactId: string;
  fiche: NetworkFiche;
  // PDS OS can send e-mails and the contact has an address.
  canEmail: boolean;
}) {
  const state = t.states[fiche.state];
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2">
      {fiche.url ? (
        <a
          href={fiche.url}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 flex-1 truncate underline underline-offset-4"
        >
          {fiche.url}
        </a>
      ) : (
        <span className="min-w-0 flex-1 truncate">
          {fiche.at ? t.on(state, formatDate(fiche.at)) : state}
        </span>
      )}
      <ContactFicheActions
        contactId={contactId}
        url={fiche.url}
        notSent={fiche.state === "link_generated"}
        canEmail={canEmail}
      />
    </span>
  );
}
