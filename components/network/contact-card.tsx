import { IconOffice, IconUser } from "nucleo-sharp-essential";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { DocumentCard } from "@/components/ui/document-card";
import { routes } from "@/lib/auth/redirects";
import { network } from "@/lib/i18n/fr/network";

const fr = { network };

/**
 * A contact of the Réseau shown where it is dealt with (Sacha, 09/11/2026:
 * « je voudrais ici le mail »): the `DocumentCard` head alone, with a
 * person or a structure as its icon, the name, one short line — what they
 * are here, then their e-mail address — and on the right the state the
 * module gives plus « Voir la fiche ». A name kept without a fiche says so
 * (its module may add « Ajouter au Réseau » in `action`).
 */
export function ContactCard({
  name,
  kind,
  contactId,
  email,
  context,
  action,
}: {
  name: string;
  // Null: a name only, not in the Réseau.
  kind: "person" | "organization" | null;
  contactId: string | null;
  email: string | null;
  // What they are here (« Droits sur l'œuvre »), before the address.
  context?: string;
  // The module's state of this contact (a `StatusBadge`).
  action?: ReactNode;
}) {
  const t = fr.network.card;
  // A name kept without a fiche may still have the address it was e-mailed
  // to (the borrowing keeps it).
  const address = email ?? (contactId ? t.noEmail : t.nameOnly);
  return (
    <DocumentCard
      name={name}
      icon={kind === "person" ? IconUser : IconOffice}
      line={
        <>
          {context && <>{context} · </>}
          <span className={email ? "break-all text-foreground" : undefined}>
            {address}
          </span>
          {email && !contactId && <> · {t.notInNetwork}</>}
        </>
      }
      action={
        (action || contactId) && (
          <span className="flex flex-wrap items-center gap-2">
            {action}
            {contactId && (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href={routes.networkContact(contactId)} />}
              >
                {t.fiche}
              </Button>
            )}
          </span>
        )
      }
    />
  );
}
