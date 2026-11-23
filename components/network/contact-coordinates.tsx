import Link from "next/link";
import type { ReactNode } from "react";

import { PageSection } from "@/components/shell/page-section";
import { FactList } from "@/components/ui/fact-list";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { network } from "@/lib/i18n/fr/network";
import type { NetworkContactDetail } from "@/lib/network/queries";
import { socialLinksOf } from "@/lib/network/socials";
import { relationsText } from "@/lib/network/types";

const fr = { network };

const linkClass =
  "underline-offset-4 hover:underline focus-visible:underline outline-none";

/** How to reach a contact, how PDS works with it, its organization and
 * catalog artist (a person), its notes. */
export function ContactCoordinates({
  contact,
  fiche,
}: {
  contact: NetworkContactDetail;
  // Its own fiche de renseignements, the first line (Sacha 23/11/2026:
  // « dans coordonnées ou plus haut », Figma node 317:5819).
  fiche?: ReactNode;
}) {
  const p = fr.network.page;
  const accounts = socialLinksOf(contact);
  // A private contact's coordinates the reader may not read are absent, not
  // empty: no « non renseigné » under the notice (UX test of 12/11/2026).
  const hidden = contact.privacy.hidden;
  const privateFact = (fact: { label: string; value: ReactNode }) =>
    hidden ? [] : [fact];
  return (
    <PageSection card id="coordinates" title={p.coordinates}>
      {/* A private contact (BIZ 8) whose coordinates the reader may not read. */}
      {hidden && (
        <ToneCallout className="mb-4">
          {fr.network.privacy.hidden} ·{" "}
          {fr.network.privacy.hiddenBody(contact.privacy.ownerName)}
        </ToneCallout>
      )}
      <FactList
        emptyLabel={p.none}
        facts={[
          // Its fiche first (Figma node 317:5819).
          ...(fiche ? [{ label: p.networkFiche.label, value: fiche }] : []),
          ...privateFact({
            label: p.email,
            value: contact.email && (
              <a href={`mailto:${contact.email}`} className={linkClass}>
                {contact.email}
              </a>
            ),
          }),
          ...privateFact({
            label: p.phone,
            value: contact.phone && (
              <a href={`tel:${contact.phone}`} className={linkClass}>
                {contact.phone}
              </a>
            ),
          }),
          {
            label: p.website,
            value: contact.website && (
              <a
                href={contact.website}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                {contact.website}
              </a>
            ),
          },
          ...privateFact({ label: p.city, value: contact.city }),
          {
            label: p.relations,
            value: relationsText(contact.relations) || null,
          },
          {
            label: p.accounts,
            value: accounts.length > 0 && (
              <span className="flex flex-col gap-1">
                {accounts.map((account) => (
                  <a
                    key={account.network}
                    href={account.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClass}
                  >
                    {fr.network.form[account.network]}
                    {account.label && ` · ${account.label}`}
                  </a>
                ))}
              </span>
            ),
          },
          ...(contact.kind === "person"
            ? [
                {
                  label: p.parent,
                  value: contact.parentId && contact.parentName && (
                    <Link
                      href={routes.networkContact(contact.parentId)}
                      className={linkClass}
                    >
                      {contact.parentName}
                    </Link>
                  ),
                },
              ]
            : []),
          // A catalog artist is a person's link only (ticket « Retour PO /
          // Réseau » of 11/10/2026: never on a label's page).
          ...(contact.kind === "person"
            ? [
                {
                  label: p.artist,
                  value: contact.artistId && contact.artistName && (
                    <Link
                      href={routes.artist(contact.artistId)}
                      className={linkClass}
                    >
                      {contact.artistName}
                    </Link>
                  ),
                },
              ]
            : []),
          ...privateFact({ label: p.notes, value: contact.notes }),
        ]}
      />
    </PageSection>
  );
}
